"""
TradeFG — MetaTrader 5 read-only bridge
=======================================

A minimal Flask server that connects to MetaTrader 5 with an **investor
(read-only) password** and exposes the account info + closed trade history
as JSON for the TradeFG web app.

The investor password is read-only by design: the MT5 server physically
cannot execute, modify, or close any trade when authenticated with it.

Setup
-----
    pip install MetaTrader5 flask flask-cors
    python mt5_bridge.py

Then in TradeFG → MT5 Account → Bridge API URL, enter:
    http://localhost:5001

Endpoints
---------
    POST /api/mt5/connect   body: { "account": 12345678, "password": "...", "server": "Broker-Server" }
                            returns: { account: {...}, deals: [...] }
    GET  /api/mt5/trades?days=30
                            returns: { deals: [...] }   (uses the last connected session)

Notes
-----
* MetaTrader5 only runs on Windows (the terminal must be installed). On
  macOS/Linux run this bridge inside a Windows VM or use a hosted MT5 API.
* CORS is enabled so the static TradeFG front-end can call it from the browser.
"""

from datetime import datetime, timedelta

from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    import MetaTrader5 as mt5
except ImportError:  # allows the file to be imported/linted without the package
    mt5 = None

app = Flask(__name__)
CORS(app)  # allow the browser front-end to call this bridge

# Remember the last successful login so /api/mt5/trades can reuse it
_SESSION = {"account": None, "password": None, "server": None}


def _require_mt5():
    if mt5 is None:
        raise RuntimeError(
            "MetaTrader5 package not installed. Run: pip install MetaTrader5 "
            "(Windows only — the MT5 terminal must be installed)."
        )


def _login(account, password, server):
    """Initialize the terminal and log in with the investor password."""
    _require_mt5()
    if not mt5.initialize():
        raise RuntimeError(f"MT5 initialize() failed: {mt5.last_error()}")
    if not mt5.login(int(account), password=password, server=server):
        err = mt5.last_error()
        mt5.shutdown()
        raise RuntimeError(f"MT5 login failed: {err}")


def _account_info():
    info = mt5.account_info()
    if info is None:
        raise RuntimeError(f"account_info() failed: {mt5.last_error()}")
    return {
        "number": info.login,
        "balance": round(info.balance, 2),
        "equity": round(info.equity, 2),
        "currency": info.currency,
        "leverage": info.leverage,
        "server": info.server,
        "company": info.company,
    }


def _closed_deals(days=30):
    """Return closed deals (entry+exit collapsed per position) for the window."""
    frm = datetime.now() - timedelta(days=days)
    deals = mt5.history_deals_get(frm, datetime.now())
    if deals is None:
        return []

    # Group deals by position id to pair the open and close sides
    positions = {}
    for d in deals:
        pid = d.position_id
        positions.setdefault(pid, []).append(d)

    out = []
    for pid, legs in positions.items():
        legs = sorted(legs, key=lambda x: x.time)
        opener = legs[0]
        closer = legs[-1]
        profit = sum(l.profit for l in legs)
        commission = sum(l.commission for l in legs)
        swap = sum(l.swap for l in legs)
        # deal type: 0 = buy, 1 = sell
        side = "buy" if opener.type == 0 else "sell"
        out.append({
            "ticket": pid,
            "symbol": opener.symbol,
            "type": side,
            "volume": round(opener.volume, 2),
            "price_open": opener.price,
            "price_close": closer.price,
            "profit": round(profit, 2),
            "commission": round(commission, 2),
            "swap": round(swap, 2),
            "time_open": int(opener.time) * 1000,
            "time_close": int(closer.time) * 1000,
        })

    out.sort(key=lambda x: x["time_close"])
    return out


@app.post("/api/mt5/connect")
def connect():
    body = request.get_json(force=True, silent=True) or {}
    account = body.get("account")
    password = body.get("password")
    server = body.get("server")
    if not account or not server:
        return jsonify({"error": "account and server are required"}), 400
    try:
        _login(account, password, server)
        _SESSION.update(account=account, password=password, server=server)
        payload = {"account": _account_info(), "deals": _closed_deals(30)}
        return jsonify(payload)
    except Exception as exc:  # noqa: BLE001 — surface a clean message to the UI
        return jsonify({"error": str(exc)}), 502


@app.get("/api/mt5/trades")
def trades():
    days = int(request.args.get("days", 30))
    if not _SESSION["account"]:
        return jsonify({"error": "not connected — call /api/mt5/connect first"}), 409
    try:
        _login(_SESSION["account"], _SESSION["password"], _SESSION["server"])
        return jsonify({"deals": _closed_deals(days)})
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 502


@app.get("/health")
def health():
    return jsonify({"ok": True, "mt5_available": mt5 is not None})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
