#!/usr/bin/env python3
"""
TradeFG MT5 Bridge — minimal Flask server.

Setup:
  pip install flask flask-cors MetaTrader5

Run:
  python mt5_bridge.py

Then set "Bridge URL" in the TradeFG MT5 modal to:
  http://localhost:5001/api/mt5/connect

Requirements: MetaTrader5 terminal must be running on the same Windows machine.
The bridge runs on the same machine as MT5 and exposes a local HTTP API that
the browser calls. The investor (read-only) password is forwarded to MT5 — no
trades can ever be placed or modified with it.
"""

import datetime
import sys

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allow browser cross-origin calls from localhost / file://

try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False
    print(
        "WARNING: MetaTrader5 package not found.\n"
        "Install it with: pip install MetaTrader5\n"
        "The server will return 503 until the package is available."
    )


def _ts(epoch_seconds):
    """Convert MT5 epoch timestamp to ISO string."""
    if not epoch_seconds:
        return None
    try:
        return datetime.datetime.fromtimestamp(epoch_seconds).isoformat()
    except Exception:
        return None


def _session(hour):
    """Map UTC hour → trading session name."""
    if 7 <= hour < 16:
        return "London"
    if 13 <= hour < 22:
        return "New York"
    return "Asia"


# ── /api/mt5/connect ────────────────────────────────────────────────────────
# POST body: { "account": 12345678, "password": "...", "server": "Broker-Demo" }
# Returns:   { "account": {...}, "deals": [...], "positions": [...] }
@app.route("/api/mt5/connect", methods=["POST"])
def connect():
    if not MT5_AVAILABLE:
        return jsonify({"error": "MetaTrader5 package not installed on this machine"}), 503

    body = request.get_json(force=True, silent=True) or {}
    account = int(body.get("account", 0))
    password = body.get("password", "")
    server = body.get("server", "")

    if not account:
        return jsonify({"error": "account number is required"}), 400

    if not mt5.initialize():
        err = mt5.last_error()
        return jsonify({"error": f"MT5 terminal not running or could not initialize: {err[1]}"}), 503

    ok = mt5.login(account, password=password, server=server)
    if not ok:
        err = mt5.last_error()
        mt5.shutdown()
        return jsonify({"error": f"Login failed: {err[1]}"}), 401

    info = mt5.account_info()
    acc = {
        "login": info.login,
        "name": info.name,
        "balance": info.balance,
        "equity": info.equity,
        "currency": info.currency,
        "leverage": info.leverage,
        "server": info.server,
        "company": info.company,
    }

    # Closed deals — last 30 days, OUT entries only (completed trades)
    from_dt = datetime.datetime.now() - datetime.timedelta(days=30)
    to_dt = datetime.datetime.now()
    raw_deals = mt5.history_deals_get(from_dt, to_dt) or []

    deals = []
    for d in raw_deals:
        # DEAL_ENTRY_OUT = 1  (closing deal)
        if d.entry != 1:
            continue
        deals.append({
            "ticket": d.ticket,
            "symbol": d.symbol,
            "type": "sell" if d.type == 1 else "buy",  # DEAL_TYPE_SELL = 1
            "volume": d.volume,
            "price": d.price,
            "profit": d.profit,
            "commission": d.commission,
            "swap": d.swap,
            "time": _ts(d.time),
            "session": _session(datetime.datetime.fromtimestamp(d.time).hour) if d.time else "Unknown",
        })

    # Open positions
    raw_pos = mt5.positions_get() or []
    positions = []
    for p in raw_pos:
        positions.append({
            "ticket": p.ticket,
            "symbol": p.symbol,
            "type": "sell" if p.type == 1 else "buy",  # ORDER_TYPE_SELL = 1
            "volume": p.volume,
            "openPrice": p.price_open,
            "currentPrice": p.price_current,
            "profit": p.profit,
            "swap": p.swap,
            "openTime": _ts(p.time),
        })

    mt5.shutdown()
    return jsonify({"account": acc, "deals": deals, "positions": positions})


# ── /api/mt5/trades ─────────────────────────────────────────────────────────
# POST body: { "account": ..., "password": ..., "server": ..., "days": 90 }
# Returns:   { "deals": [...] }
@app.route("/api/mt5/trades", methods=["POST"])
def trades():
    if not MT5_AVAILABLE:
        return jsonify({"error": "MetaTrader5 package not installed on this machine"}), 503

    body = request.get_json(force=True, silent=True) or {}
    account = int(body.get("account", 0))
    password = body.get("password", "")
    server = body.get("server", "")
    days = int(body.get("days", 90))

    if not account:
        return jsonify({"error": "account number is required"}), 400

    if not mt5.initialize():
        err = mt5.last_error()
        return jsonify({"error": f"MT5 terminal not running: {err[1]}"}), 503

    ok = mt5.login(account, password=password, server=server)
    if not ok:
        err = mt5.last_error()
        mt5.shutdown()
        return jsonify({"error": f"Login failed: {err[1]}"}), 401

    from_dt = datetime.datetime.now() - datetime.timedelta(days=days)
    raw_deals = mt5.history_deals_get(from_dt, datetime.datetime.now()) or []

    deals = []
    for d in raw_deals:
        deals.append({
            "ticket": d.ticket,
            "symbol": d.symbol,
            "type": "sell" if d.type == 1 else "buy",
            "volume": d.volume,
            "price": d.price,
            "profit": d.profit,
            "commission": d.commission,
            "swap": d.swap,
            "time": _ts(d.time),
            "session": _session(datetime.datetime.fromtimestamp(d.time).hour) if d.time else "Unknown",
        })

    mt5.shutdown()
    return jsonify({"deals": deals})


# ── /api/status ──────────────────────────────────────────────────────────────
@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({
        "bridge": "TradeFG MT5 Bridge",
        "mt5_available": MT5_AVAILABLE,
        "version": "1.0.0",
    })


if __name__ == "__main__":
    print("=" * 60)
    print("  TradeFG MT5 Bridge")
    print("  Running on http://localhost:5001")
    print()
    print("  In the TradeFG MT5 modal, set Bridge URL to:")
    print("    http://localhost:5001/api/mt5/connect")
    print()
    print("  MT5 package available:", MT5_AVAILABLE)
    print("=" * 60)
    app.run(host="0.0.0.0", port=5001, debug=False)
