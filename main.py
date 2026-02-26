#!/usr/bin/env python3
"""
TALASHNY - عروض فودافون
تشغيل:
    pip install flask requests
    python talashny.py
ثم افتح http://localhost:5000
"""

try:
    from flask import Flask, request, session, redirect, jsonify, make_response
    import requests as req
except ImportError:
    import os
    os.system("pip install flask requests -q")
    from flask import Flask, request, session, redirect, jsonify, make_response
    import requests as req

import json, os, time

app = Flask(__name__)
app.secret_key = "vf_talashny_secret_2025"

# ══════════════════════════════════════════
#  VODAFONE API FUNCTIONS
# ══════════════════════════════════════════

def login_password(number, password):
    try:
        r = req.post(
            "https://mobile.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/token",
            data={
                "grant_type": "password", "username": number, "password": password,
                "client_secret": "95fd95fb-7489-4958-8ae6-d31a525cd20a",
                "client_id": "ana-vodafone-app"
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "User-Agent": "okhttp/4.11.0",
                "clientId": "AnaVodafoneAndroid",
                "x-agent-operatingsystem": "13",
                "Accept-Language": "ar",
                "x-agent-device": "Xiaomi 21061119AG",
                "x-agent-version": "2025.10.3",
                "x-agent-build": "1050",
                "digitalId": "28RI9U7ISU8SW",
                "device-id": "1df4efae59648ac3",
            },
            timeout=15, verify=False
        )
        return r.json()
    except:
        return {}

def login_data(client_ip=None):
    # لوجين الداتا مش بيشتغل من سيرفر خارجي — فودافون بتبلوك أي طلب مش من شبكتها
    return {"_error": "لوجين الداتا يشتغل بس من موبايل على شبكة فودافون مباشرة — استخدم الرقم والباسورد"}

def get_promos(token, number):
    try:
        r = req.get(
            "https://web.vodafone.com.eg/services/dxl/ramadanpromo/promotion",
            params={"@type": "RamadanHub", "channel": "website", "msisdn": number},
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
                "Accept": "application/json",
                "clientId": "WebsiteConsumer",
                "api-host": "PromotionHost",
                "channel": "WEB",
                "Accept-Language": "ar",
                "msisdn": number,
                "Content-Type": "application/json",
                "Referer": "https://web.vodafone.com.eg/ar/ramadan",
            },
            timeout=15, verify=False
        )
        dec = r.json()
    except:
        return []

    cards = []
    if not isinstance(dec, list):
        return cards
    for item in dec:
        if not isinstance(item, dict) or "pattern" not in item:
            continue
        for pat in item["pattern"]:
            for act in pat.get("action", []):
                c = {ch["name"]: str(ch["value"]) for ch in act.get("characteristics", [])}
                if not c:
                    continue
                serial = c.get("CARD_SERIAL", "").strip()
                if len(serial) != 13:
                    continue
                cards.append({
                    "serial": serial,
                    "gift": int(c.get("GIFT_UNITS", 0)),
                    "amount": int(c.get("amount", 0)),
                    "remaining": int(c.get("REMAINING_DEDICATIONS", 0)),
                })
    cards.sort(key=lambda x: -x["amount"])
    return cards

def redeem_card(token, number, serial):
    try:
        r = req.post(
            "https://web.vodafone.com.eg/services/dxl/ramadanpromo/promotion",
            json={
                "@type": "Promo",
                "channel": {"id": "1"},
                "context": {"type": "RamadanRedeemFromHub"},
                "pattern": [{"characteristics": [{"name": "cardSerial", "value": serial}]}],
            },
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/133.0.0.0 Mobile Safari/537.36",
                "clientId": "WebsiteConsumer",
                "channel": "WEB",
                "msisdn": number,
                "Accept-Language": "AR",
                "Origin": "https://web.vodafone.com.eg",
                "Referer": "https://web.vodafone.com.eg/portal/hub",
            },
            timeout=15, verify=False
        )
        return r.status_code
    except:
        return 0

def refresh_token():
    if time.time() < session.get("token_exp", 0):
        return True
    if session.get("login_method") == "data":
        res = login_data()
        if "access_token" in res:
            session["token"] = res["access_token"]
            session["token_exp"] = time.time() + int(res.get("expires_in", 3600)) - 120
            if "_number" in res:
                session["number"] = res["_number"]
            return True
    else:
        res = login_password(session.get("number", ""), session.get("password", ""))
        if "access_token" in res:
            session["token"] = res["access_token"]
            session["token_exp"] = time.time() + int(res.get("expires_in", 3600)) - 120
            return True
    return False

# ══════════════════════════════════════════
#  HTML TEMPLATE
# ══════════════════════════════════════════

HTML = r"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<title>TALASHNY</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Bebas+Neue&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
<style>
:root {
  --red: #e60000;
  --red2: #ff2222;
  --red-glow: rgba(230,0,0,0.35);
  --gold: #c9a84c;
  --gold2: #f0d080;
  --bg: #080808;
  --bg2: #0f0f0f;
  --bg3: #161616;
  --glass: rgba(255,255,255,0.04);
  --glass2: rgba(255,255,255,0.07);
  --border: rgba(255,255,255,0.07);
  --border2: rgba(230,0,0,0.2);
  --text: #f0f0f0;
  --text2: #888;
  --text3: #555;
  --green: #00e676;
  --r: 16px;
  --r2: 24px;
}
*,*::before,*::after { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html,body { height:100%; overflow-x:hidden; }
body {
  font-family: 'Cairo', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding-bottom: 80px;
  padding-top: 0;
}

/* ══ CANVAS BG ══ */
#BGC { position:fixed; inset:0; z-index:0; pointer-events:none; }

/* ══ NOISE OVERLAY ══ */
body::before {
  content:'';
  position:fixed; inset:0; z-index:1; pointer-events:none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  opacity: 0.4;
}

/* ══ WRAP ══ */
.wrap { max-width: 480px; margin: 0 auto; padding: 0 18px; position:relative; z-index:10; }

/* ══ BANNER ══ */
.banner {
  position:fixed; top:0; left:0; right:0; height:95px;
  background:#000;
  display:flex; justify-content:center; align-items:center;
  font-size:2.8rem; font-weight:900; letter-spacing:6px; text-transform:uppercase;
  box-shadow:0 6px 40px rgba(0,0,0,0.8);
  z-index:1000;
  border-bottom-left-radius:60% 40%; border-bottom-right-radius:60% 40%;
  overflow:hidden; gap:5px;
}
.banner::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);
}
.banner span {
  display:inline-block; color:transparent;
  background:linear-gradient(90deg,#c0c0c0 0%,#fff 20%,#e0e0e0 40%,#fff 60%,#b0b0b0 80%,#c0c0c0 100%);
  background-size:400% 100%;
  -webkit-background-clip:text; -webkit-text-fill-color:transparent;
  animation:chrome-shine 4s linear infinite;
  animation-delay:calc(var(--i)*0.18s);
}
@keyframes chrome-shine { 0%{background-position:400% center} 100%{background-position:-400% center} }

/* ══ LOGO + GARLANDS ══ */
.small-logo-under-banner {
  position:fixed; top:100px; left:51%; transform:translateX(-50%);
  z-index:999; margin-top:8px;
}
.small-logo-under-banner img {
  width:38px; height:auto; display:block;
  filter:drop-shadow(0 1px 4px rgba(0,0,0,0.6));
}
.ramadan-decoration {
  position:fixed; top:85px; left:0; right:0; height:170px;
  pointer-events:none; z-index:999;
  display:flex; justify-content:space-between; align-items:flex-start; padding:0 2px;
}
.garland-left,.garland-right {
  max-width:45%; max-height:100%; object-fit:contain;
  filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));
}
.garland-left  { animation:swing-left  24s infinite ease-in-out; transform-origin:top left; }
.garland-right { animation:swing-right 26s infinite ease-in-out; transform-origin:top right; }
@keyframes swing-left  { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(-1.5deg)} }
@keyframes swing-right { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate( 1.5deg)} }

/* ══ LOGIN PAGE ══ */
.login-wrap {
  padding-top: 185px;
  display: flex; flex-direction: column; gap: 16px;
}

/* hero */
.hero {
  position: relative; overflow: hidden;
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: var(--r2);
  padding: 28px 24px;
  text-align: center;
}
.hero::before {
  content:'';
  position:absolute; top:-60px; left:50%; transform:translateX(-50%);
  width:300px; height:300px; border-radius:50%;
  background: radial-gradient(circle, rgba(230,0,0,0.18) 0%, transparent 70%);
  pointer-events:none;
}
.hero-vf {
  width:56px; height:56px; border-radius:18px;
  background: var(--red);
  display: flex; align-items:center; justify-content:center;
  margin: 0 auto 16px;
  box-shadow: 0 0 30px var(--red-glow), 0 0 60px rgba(230,0,0,0.15);
  position:relative; z-index:1;
  animation: logo-float 3s ease-in-out infinite;
}
@keyframes logo-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
.hero-vf img { width:34px; filter: brightness(0) invert(1); }
.hero-title {
  font-size: 1.5rem; font-weight: 900; color: #fff;
  margin-bottom: 6px; position:relative; z-index:1;
  line-height: 1.3;
}
.hero-title em { font-style:normal; color: var(--red); }
.hero-sub {
  font-size: 0.72rem; color: var(--text2);
  position:relative; z-index:1;
  letter-spacing: 0.5px;
}

/* error */
.err-box {
  display: flex; align-items: center; gap: 10px;
  background: rgba(230,0,0,0.08);
  border: 1px solid rgba(230,0,0,0.2);
  border-radius: var(--r);
  padding: 12px 14px;
  font-size: 0.78rem; font-weight: 700; color: #ff6b6b;
  animation: shake 0.4s ease;
}
@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
.err-box i { flex-shrink:0; }

/* form card */
.form-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  padding: 24px;
  display: flex; flex-direction: column; gap: 14px;
}
.form-card-title {
  font-size: 0.65rem; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: var(--text3);
  margin-bottom: -4px;
}

/* inputs */
.field {
  display: flex; flex-direction: column; gap: 6px;
}
.field label {
  font-size: 0.62rem; font-weight: 800; letter-spacing: 1.8px;
  text-transform: uppercase; color: var(--text3);
  transition: color 0.25s;
  text-align: right; display: block;
}
.field:focus-within label { color: var(--red); }
.input-wrap {
  position: relative; display: flex; align-items: center;
  background: var(--bg2);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
  overflow: hidden; direction: rtl;
}
.input-wrap::after {
  content:'';
  position:absolute; bottom:0; right:0; left:0; height:2px;
  background: linear-gradient(90deg, var(--gold), var(--red), var(--gold));
  transform: scaleX(0); transform-origin: right;
  transition: transform 0.35s cubic-bezier(.34,1.4,.64,1);
}
.field:focus-within .input-wrap::after { transform: scaleX(1); }
.field:focus-within .input-wrap {
  border-color: var(--border2);
  background: rgba(230,0,0,0.04);
  box-shadow: 0 0 0 3px rgba(230,0,0,0.07), 0 4px 16px rgba(0,0,0,0.3);
}
.input-wrap .inp-icon {
  width: 46px; text-align: center;
  font-size: 0.88rem; color: var(--text3);
  transition: color 0.25s, transform 0.25s; flex-shrink: 0;
  order: 2;
}
.field:focus-within .input-wrap .inp-icon { color: var(--red); transform: scale(1.15); }
.input-wrap i {
  width: 46px; text-align: center;
  font-size: 0.88rem; color: var(--text3);
  transition: color 0.25s; flex-shrink: 0; order: 2;
}
.field:focus-within .input-wrap i { color: var(--red); }
.input-wrap input {
  flex:1; background:none; border:none; outline:none;
  font-family: 'Cairo', sans-serif;
  font-size: 0.95rem; font-weight: 700; color: var(--text);
  padding: 14px 16px 14px 14px;
  text-align: right; direction: rtl; order: 1;
  -webkit-user-select: text !important; user-select: text !important;
}
.input-wrap input::placeholder { color: var(--text3); font-weight: 400; font-size: 0.82rem; text-align: right; }
.submit-btn {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 15px;
  border: none; border-radius: 14px;
  background: var(--red);
  font-family: 'Cairo', sans-serif;
  font-size: 0.95rem; font-weight: 900;
  color: #fff; cursor: pointer;
  box-shadow: 0 4px 24px var(--red-glow);
  transition: transform 0.25s cubic-bezier(.34,1.4,.64,1), box-shadow 0.25s;
}
.submit-btn::before {
  content:'';
  position:absolute; inset:0;
  background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%);
}
.submit-btn::after {
  content:'';
  position:absolute; top:0; left:-100%; width:60%; height:100%;
  background: linear-gradient(105deg, transparent, rgba(255,255,255,0.15), transparent);
  transition: left 0.5s ease;
}
.submit-btn:hover::after { left:150%; }
.submit-btn:hover { transform:translateY(-2px); box-shadow:0 8px 32px var(--red-glow); }
.submit-btn:active { transform:scale(0.97) !important; }
.submit-btn:disabled { opacity:0.5; cursor:wait; }
.submit-btn i { font-size:0.9rem; position:relative; z-index:1; }
.submit-btn span { position:relative; z-index:1; }

/* ══ APP PAGE ══ */
.app-wrap { padding-top: 185px; display:flex; flex-direction:column; gap:14px; }

/* user bar */
.user-bar {
  display:flex; align-items:center; justify-content:space-between;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  padding: 14px 18px;
}
.user-left { display:flex; align-items:center; gap:12px; }
.user-av {
  width:42px; height:42px; border-radius:13px;
  background: linear-gradient(135deg, var(--red), #800000);
  display:flex; align-items:center; justify-content:center;
  box-shadow: 0 0 16px var(--red-glow);
  flex-shrink:0;
}
.user-av i { color:#fff; font-size:1rem; }
.user-name { font-size:0.95rem; font-weight:800; color:var(--text); letter-spacing:0.5px; }
.user-badge {
  display:inline-flex; align-items:center; gap:5px;
  font-size:0.58rem; font-weight:700; color:var(--green);
  letter-spacing:1px; text-transform:uppercase; margin-top:2px;
}
.user-badge::before {
  content:'';
  width:5px; height:5px; border-radius:50%;
  background:var(--green); box-shadow:0 0 6px var(--green);
  animation: pulse-dot 2s infinite;
}
.logout-btn {
  display:flex; align-items:center; gap:6px;
  background:transparent; border:1px solid var(--border);
  border-radius:100px; padding:7px 14px;
  font-family:'Cairo',sans-serif; font-size:0.7rem; font-weight:700;
  color:var(--text2); cursor:pointer; text-decoration:none;
  transition:all 0.2s;
}
.logout-btn:hover { border-color:rgba(230,0,0,0.3); color:var(--red); background:rgba(230,0,0,0.05); }

/* timer */
.timer-bar {
  display:flex; align-items:center; gap:12px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 12px 16px;
}
.timer-ring { width:40px; height:40px; position:relative; flex-shrink:0; }
.timer-ring svg { width:40px; height:40px; transform:rotate(-90deg); }
.timer-bg { fill:none; stroke:rgba(255,255,255,0.06); stroke-width:3; }
.timer-prog {
  fill:none; stroke:var(--red); stroke-width:3; stroke-linecap:round;
  stroke-dasharray:113; stroke-dashoffset:0;
  transition: stroke-dashoffset 0.9s linear, stroke 0.3s;
  filter: drop-shadow(0 0 4px var(--red));
}
.timer-num {
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  font-size:0.75rem; font-weight:900; color:var(--text);
}
.timer-info { flex:1; }
.timer-label { font-size:0.78rem; font-weight:700; color:var(--text2); }
.timer-sub { font-size:0.6rem; color:var(--text3); margin-top:2px; }
.timer-live {
  display:flex; align-items:center; gap:5px;
  font-size:0.58rem; font-weight:700; color:var(--red);
  letter-spacing:1px; text-transform:uppercase;
}
.timer-live::before {
  content:''; width:6px; height:6px; border-radius:50%;
  background:var(--red); box-shadow:0 0 6px var(--red);
  animation:blink 1s ease-in-out infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

/* section header */
.sec-head {
  display:flex; align-items:center; justify-content:space-between;
}
.sec-title {
  font-size:0.65rem; font-weight:700; letter-spacing:2px;
  text-transform:uppercase; color:var(--text3);
  display:flex; align-items:center; gap:8px;
}
.sec-title::before {
  content:''; width:16px; height:2px;
  background:linear-gradient(90deg, var(--red), var(--gold));
}
.sec-count {
  font-size:0.65rem; font-weight:700; color:var(--text3);
  background:var(--glass2); border:1px solid var(--border);
  padding:3px 10px; border-radius:100px;
}

/* card */
.promo-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  overflow: hidden;
  animation: cardIn 0.45s cubic-bezier(.34,1.4,.64,1) both;
  animation-delay: calc(var(--ix,0) * 0.07s);
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
@keyframes cardIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
.promo-card:hover {
  transform: translateY(-3px);
  border-color: var(--border2);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 20px rgba(230,0,0,0.08);
}

.card-top {
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--border);
  display:flex; align-items:flex-start; justify-content:space-between;
}
.card-amount-big { font-family:'Bebas Neue',sans-serif; font-size:3rem; color:#fff; line-height:1; }
.card-amount-unit { font-size:0.7rem; font-weight:700; color:var(--text2); margin-top:4px; }
.card-chips { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
.chip {
  display:inline-flex; align-items:center; gap:4px;
  padding:4px 10px; border-radius:100px;
  font-size:0.62rem; font-weight:700;
}
.chip-gold {
  background:rgba(201,168,76,0.1); color:var(--gold2);
  border:1px solid rgba(201,168,76,0.2);
}
.chip-blue {
  background:rgba(99,179,237,0.08); color:#63b3ed;
  border:1px solid rgba(99,179,237,0.15);
}
.chip i { font-size:0.58rem; }

.card-serial-row {
  padding:12px 18px;
  border-bottom:1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between;
  background: rgba(0,0,0,0.3);
}
.serial-code {
  font-family:monospace; font-size:0.95rem; letter-spacing:3px;
  color:var(--text); font-weight:600;
}
.copy-btn {
  width:32px; height:32px; border-radius:9px;
  background:var(--glass); border:1px solid var(--border);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all 0.2s; flex-shrink:0;
  color:var(--text3);
}
.copy-btn:hover { background:rgba(230,0,0,0.1); border-color:var(--border2); color:var(--red); }
.copy-btn:active { transform:scale(0.88); }
.copy-btn i { font-size:0.75rem; }

.card-actions {
  display:flex; gap:8px; padding:10px;
}
.act-btn {
  flex:1; display:flex; align-items:center; justify-content:center; gap:6px;
  padding:11px 8px; border:none; border-radius:12px;
  font-family:'Cairo',sans-serif; font-size:0.78rem; font-weight:800;
  cursor:pointer; text-decoration:none;
  transition:all 0.2s cubic-bezier(.34,1.4,.64,1);
  position:relative; overflow:hidden;
}
.act-charge {
  background: var(--red);
  color:#fff;
  box-shadow: 0 4px 16px var(--red-glow);
}
.act-charge::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.12),transparent 50%);
}
.act-charge:hover { transform:translateY(-1px); box-shadow:0 8px 24px var(--red-glow); }
.act-charge.loading { opacity:0.6; pointer-events:none; }
.act-dial {
  background:var(--glass2); color:var(--text2);
  border:1px solid var(--border);
}
.act-dial:hover { background:var(--glass); color:var(--text); border-color:rgba(255,255,255,0.12); }
.act-btn:active { transform:scale(0.95) !important; }
.act-btn i { font-size:0.78rem; position:relative; z-index:1; }
.act-btn span { position:relative; z-index:1; }

/* empty */
.empty-state {
  text-align:center; padding:48px 24px;
  background:var(--bg3); border:1px solid var(--border); border-radius:var(--r2);
}
.empty-state .empty-icon { font-size:2.4rem; color:var(--text3); margin-bottom:14px; display:block; }
.empty-state p { font-size:0.88rem; color:var(--text2); }
.empty-state small { font-size:0.68rem; color:var(--text3); margin-top:6px; display:block; }

/* toast */
.toast {
  position:fixed; bottom:90px; left:50%;
  transform:translateX(-50%) translateY(16px);
  background:rgba(15,15,15,0.95);
  border:1px solid var(--border);
  border-radius:100px; padding:10px 22px;
  font-family:'Cairo',sans-serif; font-size:0.76rem; font-weight:700;
  color:#fff; opacity:0; pointer-events:none; z-index:999;
  white-space:nowrap; backdrop-filter:blur(20px);
  transition:all 0.3s cubic-bezier(.34,1.4,.64,1);
}
.toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
.toast.ok { border-color:rgba(0,230,118,0.3); color:#00e676; }
.toast.err { border-color:rgba(230,0,0,0.3); color:#ff5252; }

/* nav */
.bot-nav {
  position:fixed; bottom:0; left:0; right:0;
  background:rgba(8,8,8,0.92); backdrop-filter:blur(20px);
  border-top:1px solid var(--border);
  display:flex; justify-content:space-around;
  padding:10px 0 18px; z-index:100;
}
.bot-nav a {
  text-decoration:none; color:var(--text3);
  display:flex; flex-direction:column; align-items:center; gap:3px;
  padding:4px 24px; border-radius:10px;
  transition:color 0.2s, transform 0.2s;
  font-size:0.55rem; font-weight:700; letter-spacing:0.5px;
}
.bot-nav a:hover { color:var(--red); transform:translateY(-3px); }
.bot-nav i { font-size:1.4rem; }
</style>
</head>
<body oncontextmenu="return false;">

<canvas id="BGC"></canvas>

<div class="banner">
    <span style="--i:0">Y</span><span style="--i:1">N</span><span style="--i:2">H</span>
    <span style="--i:3">S</span><span style="--i:4">A</span><span style="--i:5">L</span>
    <span style="--i:6">A</span><span style="--i:7">T</span>
</div>
<div class="small-logo-under-banner">
    <img src="https://tlashane.serv00.net/vo/mS.png" alt="">
</div>
<div class="ramadan-decoration">
    <img src="https://tlashane.serv00.net/vo/CRT.png" alt="" class="garland-left">
    <img src="https://tlashane.serv00.net/vo/CRT.png" alt="" class="garland-right">
</div>

<div class="wrap">

{% if not logged_in %}
<div class="login-wrap">

  <div class="hero">
    <div class="hero-vf">
      <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt="VF">
    </div>
    <div class="hero-title">ماتخليش حاجة <em>تفوتك</em></div>
    <div class="hero-sub">كروت رمضان · فرصة · ننور بعض</div>
  </div>

  {% if error %}
  <div class="err-box">
    <i class="fas fa-circle-exclamation"></i>
    <span>{{ error }}</span>
  </div>
  {% endif %}

  <div class="form-card">
    <div class="form-card-title">تسجيل الدخول</div>
    <form method="POST" action="/login" id="LOGIN_FORM">
      <input type="hidden" name="method" value="password">
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="field">
          <label>رقم الموبايل</label>
          <div class="input-wrap">
            <input type="tel" name="number" placeholder="01XXXXXXXXX"
                   inputmode="tel" autocomplete="tel" required
                   value="{{ prefill_number }}">
            <span class="inp-icon"><i class="fas fa-mobile-screen-button"></i></span>
          </div>
        </div>
        <div class="field">
          <label>كلمة المرور</label>
          <div class="input-wrap">
            <input type="password" name="password" placeholder="كلمة المرور"
                   autocomplete="current-password" required>
            <span class="inp-icon"><i class="fas fa-lock"></i></span>
          </div>
        </div>
        <button type="submit" class="submit-btn" id="LOGIN_BTN">
          <i class="fas fa-right-to-bracket"></i>
          <span>دخول</span>
        </button>
      </div>
    </form>
  </div>

</div>

{% else %}
<div class="app-wrap">

  <div class="user-bar">
    <div class="user-left">
      <div class="user-av"><i class="fas fa-sim-card"></i></div>
      <div>
        <div class="user-name">{{ number }}</div>
        <div class="user-badge">متصل الآن</div>
      </div>
    </div>
    <a href="/logout" class="logout-btn"><i class="fas fa-power-off"></i> خروج</a>
  </div>

  <div class="timer-bar">
    <div class="timer-ring">
      <svg viewBox="0 0 40 40">
        <circle class="timer-bg" cx="20" cy="20" r="18"/>
        <circle class="timer-prog" id="PROG" cx="20" cy="20" r="18"/>
      </svg>
      <div class="timer-num" id="TNUM">15</div>
    </div>
    <div class="timer-info">
      <div class="timer-label">تحديث تلقائي</div>
      <div class="timer-sub">كل 15 ثانية</div>
    </div>
    <div class="timer-live">LIVE</div>
  </div>

  <div class="sec-head">
    <div class="sec-title">الكروت المتاحة</div>
    <div class="sec-count" id="CCOUNT">—</div>
  </div>

  <div id="CARDS">
    <div class="empty-state">
      <span class="empty-icon"><i class="fas fa-spinner fa-spin" style="color:var(--red)"></i></span>
      <p>جاري التحميل...</p>
    </div>
  </div>

</div>
{% endif %}

</div>

<div class="toast" id="TOAST"></div>

<nav class="bot-nav">
  <a href="https://t.me/FY_TF" target="_blank"><i class="fab fa-telegram-plane"></i><span>تيليجرام</span></a>
  <a href="https://wa.me/message/U6AIKBGFCNCQK1" target="_blank"><i class="fab fa-whatsapp"></i><span>واتساب</span></a>
  <a href="https://www.facebook.com/VI808IV" target="_blank"><i class="fab fa-facebook-f"></i><span>فيسبوك</span></a>
</nav>

<script>
// ══ PARTICLE BACKGROUND ══
(function(){
  const c=document.getElementById('BGC');
  const ctx=c.getContext('2d');
  let W,H,pts=[];
  function resize(){W=c.width=window.innerWidth;H=c.height=window.innerHeight;}
  resize();window.addEventListener('resize',resize);
  function mkPt(){return{x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.3,a:Math.random()};}
  for(let i=0;i<55;i++)pts.push(mkPt());
  function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>W)p.vx*=-1;
      if(p.y<0||p.y>H)p.vy*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(230,0,0,${p.a*.25})`;ctx.fill();
    });
    // lines
    for(let i=0;i<pts.length;i++){
      for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<100){
          ctx.beginPath();
          ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`rgba(230,0,0,${(1-d/100)*.06})`;
          ctx.lineWidth=.5;ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ══ UTILS ══
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function toast(msg,t=''){
  const el=document.getElementById('TOAST');
  el.textContent=msg;el.className='toast show'+(t?' '+t:'');
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2800);
}

// ══ LOGIN FORM ══
const lf=document.getElementById('LOGIN_FORM');
if(lf){
  lf.addEventListener('submit',function(){
    const b=document.getElementById('LOGIN_BTN');
    b.disabled=true;
    b.innerHTML='<i class="fas fa-spinner fa-spin"></i><span>جاري التحقق...</span>';
  });
}

// ══ COPY ══
function copySerial(btn){
  const s=btn.closest('.card-serial-row').querySelector('.serial-code').textContent.trim();
  const ok=()=>{
    const orig=btn.innerHTML;
    btn.innerHTML='<i class="fas fa-check" style="color:var(--red)"></i>';
    setTimeout(()=>{btn.innerHTML=orig},1600);
    toast('✅ تم نسخ الكود','ok');
  };
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(s).then(ok).catch(fb);
  else fb();
  function fb(){const t=document.createElement('textarea');t.value=s;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch(e){}document.body.removeChild(t);ok()}
}

// ══ CHARGE ══
async function chargeOnline(serial,btn){
  btn.classList.add('loading');
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i><span>جاري...</span>';
  try{
    const r=await fetch('/redeem?serial='+encodeURIComponent(serial));
    const d=await r.json();
    if(d.ok){
      toast('✅ تم شحن الكارت بنجاح','ok');
      btn.innerHTML='<i class="fas fa-check"></i><span>تم الشحن</span>';
      btn.style.background='var(--green)';btn.style.boxShadow='0 4px 16px rgba(0,230,118,0.3)';
      btn.classList.remove('loading');
    }else{
      toast('❌ فشل الشحن — حاول تاني','err');
      btn.classList.remove('loading');
      btn.innerHTML='<i class="fas fa-bolt"></i><span>شحن أونلاين</span>';
    }
  }catch{
    toast('❌ خطأ في الاتصال','err');
    btn.classList.remove('loading');
    btn.innerHTML='<i class="fas fa-bolt"></i><span>شحن أونلاين</span>';
  }
}

{% if logged_in %}
// ══ CARDS ══
const TOTAL=15, CIRC=2*Math.PI*18;
let TI=null;

function renderCards(promos){
  const el=document.getElementById('CARDS');
  const cc=document.getElementById('CCOUNT');
  if(!promos||!promos.length){
    if(cc)cc.textContent='0';
    el.innerHTML='<div class="empty-state"><span class="empty-icon"><i class="fas fa-inbox"></i></span><p>لا توجد عروض متاحة حالياً</p><small>يتجدد البحث تلقائياً...</small></div>';
    return;
  }
  if(cc)cc.textContent=promos.length+' كرت';
  el.innerHTML=promos.map((p,i)=>{
    const ussd='*858*'+p.serial.replace(/\s/g,'')+'#';
    return`<div class="promo-card" style="--ix:${i}">
      <div class="card-top">
        <div>
          <div class="card-amount-big">${esc(p.amount)}</div>
          <div class="card-amount-unit">جنيه مصري</div>
        </div>
        <div class="card-chips">
          <span class="chip chip-gold"><i class="fas fa-gift"></i>${esc(p.gift)} وحدة</span>
          <span class="chip chip-blue"><i class="fas fa-rotate"></i>${esc(p.remaining)} متبقي</span>
        </div>
      </div>
      <div class="card-serial-row">
        <span class="serial-code">${esc(p.serial)}</span>
        <button onclick="copySerial(this)" class="copy-btn"><i class="fas fa-clone"></i></button>
      </div>
      <div class="card-actions">
        <button class="act-btn act-charge" onclick="chargeOnline('${esc(p.serial)}',this)">
          <i class="fas fa-bolt"></i><span>شحن أونلاين</span>
        </button>
        <a href="tel:${encodeURIComponent(ussd)}" class="act-btn act-dial">
          <i class="fas fa-phone"></i><span>شحن هاتف</span>
        </a>
      </div>
    </div>`;
  }).join('');
}

function startTimer(done){
  let t=TOTAL;
  const num=document.getElementById('TNUM');
  const prog=document.getElementById('PROG');
  if(!num||!prog)return;
  prog.style.strokeDasharray=CIRC;
  prog.style.strokeDashoffset=0;
  clearInterval(TI);
  TI=setInterval(()=>{
    t--;
    if(num)num.textContent=Math.max(t,0);
    const off=CIRC*(1-t/TOTAL);
    prog.style.strokeDashoffset=off;
    prog.style.stroke=t<=5?'#ff5252':'var(--red)';
    if(t<=0){clearInterval(TI);setTimeout(done,300);}
  },1000);
}

async function fetchCards(){
  try{const r=await fetch('/fetch?t='+Date.now());const d=await r.json();if(d.ok)renderCards(d.promos);}
  catch(e){}
}
function cycle(){fetchCards();startTimer(()=>cycle());}
document.addEventListener('DOMContentLoaded',()=>cycle());
{% endif %}
</script>
</body>
</html>"""
# ══════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════

def render(logged_in=False, error="", number="", login_method="password", prefill_number=""):
    from flask import render_template_string
    return render_template_string(HTML,
        logged_in=logged_in, error=error,
        number=number, login_method=login_method,
        prefill_number=prefill_number
    )

@app.route("/", methods=["GET"])
def index():
    if session.get("logged_in"):
        return render(True, number=session.get("number",""), login_method=session.get("login_method","password"))
    return render(False)

@app.route("/login", methods=["POST"])
def login():
    method = request.form.get("method", "password")
    if method == "password":
        number   = request.form.get("number", "").strip()
        password = request.form.get("password", "").strip()
        if not number or not password:
            return render(False, error="الرجاء إدخال رقم الموبايل وكلمة المرور", prefill_number=number)
        res = login_password(number, password)
        if "access_token" in res:
            session.clear()
            session["logged_in"]    = True
            session["token"]        = res["access_token"]
            session["token_exp"]    = time.time() + int(res.get("expires_in", 3600)) - 120
            session["number"]       = number
            session["password"]     = password
            session["login_method"] = "password"
            return redirect("/")
        return render(False, error="الرقم أو الباسورد غلط — تحقق وحاول تاني", prefill_number=number)
    return render(False, error="طريقة غير معروفة")

@app.route("/data_login", methods=["POST"])
def data_login():
    # جيب IP الجهاز الحقيقي وابعته مع الطلب
    client_ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.headers.get("X-Real-IP", "")
        or request.remote_addr
        or ""
    )
    res = login_data(client_ip)
    if "access_token" in res:
        session.clear()
        session["logged_in"]    = True
        session["token"]        = res["access_token"]
        session["token_exp"]    = time.time() + int(res.get("expires_in", 3600)) - 120
        session["number"]       = res.get("_number", "")
        session["password"]     = ""
        session["login_method"] = "data"
        return jsonify({"ok": True})
    return jsonify({"ok": False, "err": res.get("_error", "unknown"), "raw": res.get("_raw")})

@app.route("/fetch")
def fetch():
    if not session.get("logged_in"):
        return jsonify({"ok": False})
    refresh_token()
    cards = get_promos(session["token"], session["number"])
    return jsonify({"ok": True, "promos": cards, "number": session["number"]})

@app.route("/redeem")
def redeem():
    if not session.get("logged_in"):
        return jsonify({"ok": False})
    refresh_token()
    serial = request.args.get("serial", "").strip()
    code   = redeem_card(session["token"], session["number"], serial)
    return jsonify({"ok": code == 200, "code": code})

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

# ══════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    print("\n" + "="*45)
    print("  TALASHNY - فودافون عروض")
    print("  http://localhost:5000")
    print("="*45 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
