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
  --r: 12px;
  --r2: 18px;
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

/* ══ SPLASH SCREEN ══ */
#SPLASH {
  position: fixed; inset: 0; z-index: 9999;
  background: #000;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0;
  overflow: hidden;
}
#SPLASH.hide {
  animation: splashOut 0.6s cubic-bezier(.4,0,.2,1) forwards;
}
@keyframes splashOut {
  0%   { opacity:1; transform:scale(1); }
  60%  { opacity:1; transform:scale(1.04); }
  100% { opacity:0; transform:scale(0.96); pointer-events:none; }
}

/* Stars bg for splash */
.splash-stars {
  position:absolute; inset:0; overflow:hidden; pointer-events:none;
}
.splash-star {
  position:absolute; width:2px; height:2px; border-radius:50%;
  background:#fff; animation: twinkle var(--d,2s) ease-in-out infinite;
  animation-delay: var(--dl,0s);
}
@keyframes twinkle { 0%,100%{opacity:0.15} 50%{opacity:0.8} }

/* Moon crescent */
.splash-moon {
  position: relative; margin-bottom: 10px;
  animation: moonFloat 0.8s cubic-bezier(.34,1.4,.64,1) both;
  animation-delay: 0.2s;
}
@keyframes moonFloat {
  from { opacity:0; transform:translateY(-30px) scale(0.7); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
.moon-svg {
  width: 90px; height: 90px;
  filter: drop-shadow(0 0 18px rgba(201,168,76,0.7)) drop-shadow(0 0 40px rgba(201,168,76,0.3));
  animation: moonGlow 2s ease-in-out infinite;
}
@keyframes moonGlow {
  0%,100% { filter: drop-shadow(0 0 18px rgba(201,168,76,0.7)) drop-shadow(0 0 40px rgba(201,168,76,0.3)); }
  50%      { filter: drop-shadow(0 0 28px rgba(201,168,76,0.95)) drop-shadow(0 0 60px rgba(201,168,76,0.5)); }
}

/* App icon */
.splash-icon {
  width: 88px; height: 88px; border-radius: 24px;
  background: linear-gradient(145deg, #1a0000, #000);
  border: 1.5px solid rgba(230,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 22px;
  box-shadow: 0 0 40px rgba(230,0,0,0.25), 0 0 80px rgba(230,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.06);
  animation: iconPop 0.7s cubic-bezier(.34,1.5,.64,1) both;
  animation-delay: 0.5s; opacity:0;
}
@keyframes iconPop {
  from { opacity:0; transform:scale(0.5) rotate(-10deg); }
  to   { opacity:1; transform:scale(1) rotate(0deg); }
}
.splash-icon img { width: 52px; height: auto; }

/* App name on splash */
.splash-name {
  font-size: 2.4rem; font-weight: 900; letter-spacing: 7px;
  text-transform: uppercase;
  background: linear-gradient(90deg, #c0c0c0 0%, #fff 30%, #e0e0e0 50%, #fff 70%, #b0b0b0 100%);
  background-size: 300% 100%;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  animation: splashNameIn 0.6s cubic-bezier(.34,1.4,.64,1) both, chrome-shine 3s linear infinite;
  animation-delay: 0.7s, 0s; opacity:0;
  animation-fill-mode: forwards, normal;
}
@keyframes splashNameIn {
  from { opacity:0; transform:translateY(16px) scale(0.92); letter-spacing:2px; }
  to   { opacity:1; transform:translateY(0) scale(1); letter-spacing:7px; }
}
.splash-tagline {
  margin-top: 8px; font-size: 0.68rem; color: rgba(201,168,76,0.7);
  letter-spacing: 2px; text-transform: uppercase;
  animation: fadeUp 0.5s ease both; animation-delay: 1s; opacity:0;
  animation-fill-mode: forwards;
}
@keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

/* Loading dots on splash */
.splash-dots {
  position: absolute; bottom: 60px;
  display: flex; gap: 7px;
  animation: fadeUp 0.5s ease both; animation-delay: 1.1s; opacity:0;
  animation-fill-mode: forwards;
}
.splash-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(230,0,0,0.5);
  animation: dotBounce 1.2s ease-in-out infinite;
}
.splash-dot:nth-child(1){animation-delay:0s}
.splash-dot:nth-child(2){animation-delay:0.2s; background:rgba(201,168,76,0.6);}
.splash-dot:nth-child(3){animation-delay:0.4s}
@keyframes dotBounce { 0%,100%{transform:scaleY(0.5);opacity:0.4} 50%{transform:scaleY(1.3);opacity:1} }

/* Splash vf logo small */
.splash-vf-badge {
  position: absolute; bottom: 28px;
  display: flex; align-items: center; gap: 6px;
  font-size: 0.58rem; color: rgba(255,255,255,0.2); letter-spacing:1px;
  animation: fadeUp 0.5s ease both; animation-delay: 1.3s; opacity:0;
  animation-fill-mode: forwards;
}
.splash-vf-badge img { width:14px; filter:brightness(0) invert(1); opacity:0.3; }

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
.wrap { max-width: 480px; margin: 0 auto; padding: 0 14px; position:relative; z-index:10; }

/* ══ BANNER ══ */
.banner {
  position:fixed; top:0; left:0; right:0; height:88px;
  background:#000;
  display:flex; justify-content:center; align-items:center;
  font-size:2.6rem; font-weight:900; letter-spacing:6px; text-transform:uppercase;
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
  position:fixed; top:93px; left:51%; transform:translateX(-50%);
  z-index:999; margin-top:6px;
}
.small-logo-under-banner img {
  width:34px; height:auto; display:block;
  filter:drop-shadow(0 1px 4px rgba(0,0,0,0.6));
}
.ramadan-decoration {
  position:fixed; top:78px; left:0; right:0; height:160px;
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
  padding-top: 175px;
  display: flex; flex-direction: column; gap: 14px;
}

/* hero */
.hero {
  position: relative; overflow: hidden;
  background: linear-gradient(145deg, #130000, var(--bg3));
  border: 1px solid rgba(230,0,0,0.15);
  border-radius: var(--r2);
  padding: 24px 20px;
  text-align: center;
}
.hero::before {
  content:'';
  position:absolute; top:-50px; left:50%; transform:translateX(-50%);
  width:260px; height:260px; border-radius:50%;
  background: radial-gradient(circle, rgba(230,0,0,0.14) 0%, transparent 70%);
  pointer-events:none;
}
/* Ramadan stars in hero */
.hero::after {
  content: '✦  ✦  ✦';
  position:absolute; top:10px; left:50%; transform:translateX(-50%);
  font-size:0.55rem; color:rgba(201,168,76,0.35); letter-spacing:6px;
}
.hero-moon-small {
  width:38px; height:38px; margin:0 auto 10px;
  animation: logo-float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(201,168,76,0.5));
  position:relative; z-index:1;
}
@keyframes logo-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
.hero-vf {
  width:50px; height:50px; border-radius:16px;
  background: linear-gradient(145deg, #2a0000, var(--red));
  display: flex; align-items:center; justify-content:center;
  margin: 0 auto 12px;
  box-shadow: 0 0 28px var(--red-glow), 0 0 55px rgba(230,0,0,0.12);
  position:relative; z-index:1;
  animation: logo-float 3s ease-in-out infinite;
}
.hero-vf img { width:30px; filter: brightness(0) invert(1); }
.hero-title {
  font-size: 1.35rem; font-weight: 900; color: #fff;
  margin-bottom: 5px; position:relative; z-index:1;
  line-height: 1.3;
}
.hero-title em { font-style:normal; color: var(--red); }
.hero-sub {
  font-size: 0.68rem; color: rgba(201,168,76,0.6);
  position:relative; z-index:1;
  letter-spacing: 1px;
}
/* small crescent + star decoration */
.hero-deco {
  position:absolute; top:12px; left:16px;
  font-size:1.1rem; color:rgba(201,168,76,0.2);
  animation: logo-float 4s ease-in-out infinite;
}
.hero-deco2 {
  position:absolute; top:12px; right:16px;
  font-size:0.85rem; color:rgba(201,168,76,0.15);
  animation: logo-float 5s ease-in-out infinite;
  animation-delay:.5s;
}

/* error */
.err-box {
  display: flex; align-items: center; gap: 10px;
  background: rgba(230,0,0,0.08);
  border: 1px solid rgba(230,0,0,0.2);
  border-radius: var(--r);
  padding: 11px 14px;
  font-size: 0.76rem; font-weight: 700; color: #ff6b6b;
  animation: shake 0.4s ease;
}
@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
.err-box i { flex-shrink:0; }

/* form card */
.form-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  padding: 20px 18px;
  display: flex; flex-direction: column; gap: 13px;
}
.form-card-header {
  display:flex; align-items:center; gap:8px; margin-bottom:-2px;
}
.form-card-title {
  font-size: 0.62rem; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: var(--text3);
}

/* inputs */
.field {
  display: flex; flex-direction: column; gap: 5px;
}
.field label {
  font-size: 0.6rem; font-weight: 800; letter-spacing: 1.8px;
  text-transform: uppercase; color: var(--text3);
  transition: color 0.25s;
  text-align: right; display: block;
}
.field:focus-within label { color: var(--red); }
.input-wrap {
  position: relative; display: flex; align-items: center;
  background: var(--bg2);
  border: 1.5px solid var(--border);
  border-radius: 13px;
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
  width: 42px; text-align: center;
  font-size: 0.85rem; color: var(--text3);
  transition: color 0.25s, transform 0.25s; flex-shrink: 0;
  order: 2;
}
.field:focus-within .input-wrap .inp-icon { color: var(--red); transform: scale(1.15); }
.input-wrap input {
  flex:1; background:none; border:none; outline:none;
  font-family: 'Cairo', sans-serif;
  font-size: 0.92rem; font-weight: 700; color: var(--text);
  padding: 12px 14px 12px 12px;
  text-align: right; direction: rtl; order: 1;
  -webkit-user-select: text !important; user-select: text !important;
}
.input-wrap input::placeholder { color: var(--text3); font-weight: 400; font-size: 0.78rem; text-align: right; }
.submit-btn {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 14px;
  border: none; border-radius: 13px;
  background: linear-gradient(135deg, #c00, var(--red), #e00);
  font-family: 'Cairo', sans-serif;
  font-size: 0.92rem; font-weight: 900;
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
.submit-btn i { font-size:0.88rem; position:relative; z-index:1; }
.submit-btn span { position:relative; z-index:1; }

/* secure note */
.secure-note {
  display:flex; align-items:center; justify-content:center; gap:5px;
  font-size:0.56rem; color:var(--text3); letter-spacing:0.5px;
  margin-top:-4px;
}
.secure-note i { font-size:0.5rem; color:var(--green); }

/* ══ APP PAGE ══ */
.app-wrap { padding-top: 175px; display:flex; flex-direction:column; gap:11px; }

/* user bar */
.user-bar {
  display:flex; align-items:center; justify-content:space-between;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  padding: 12px 16px;
}
.user-left { display:flex; align-items:center; gap:10px; }
.user-av {
  width:38px; height:38px; border-radius:12px;
  background: linear-gradient(135deg, var(--red), #800000);
  display:flex; align-items:center; justify-content:center;
  box-shadow: 0 0 14px var(--red-glow);
  flex-shrink:0;
}
.user-av i { color:#fff; font-size:0.9rem; }
.user-name { font-size:0.88rem; font-weight:800; color:var(--text); letter-spacing:0.5px; }
.user-badge {
  display:inline-flex; align-items:center; gap:5px;
  font-size:0.56rem; font-weight:700; color:var(--green);
  letter-spacing:1px; text-transform:uppercase; margin-top:2px;
}
.user-badge::before {
  content:'';
  width:4px; height:4px; border-radius:50%;
  background:var(--green); box-shadow:0 0 5px var(--green);
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
.logout-btn {
  display:flex; align-items:center; gap:5px;
  background:transparent; border:1px solid var(--border);
  border-radius:100px; padding:6px 12px;
  font-family:'Cairo',sans-serif; font-size:0.66rem; font-weight:700;
  color:var(--text2); cursor:pointer; text-decoration:none;
  transition:all 0.2s;
}
.logout-btn:hover { border-color:rgba(230,0,0,0.3); color:var(--red); background:rgba(230,0,0,0.05); }

/* timer */
.timer-bar {
  display:flex; align-items:center; gap:10px;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 10px 14px;
}
.timer-ring { width:36px; height:36px; position:relative; flex-shrink:0; }
.timer-ring svg { width:36px; height:36px; transform:rotate(-90deg); }
.timer-bg { fill:none; stroke:rgba(255,255,255,0.06); stroke-width:3; }
.timer-prog {
  fill:none; stroke:var(--red); stroke-width:3; stroke-linecap:round;
  stroke-dasharray:101; stroke-dashoffset:0;
  transition: stroke-dashoffset 0.9s linear, stroke 0.3s;
  filter: drop-shadow(0 0 4px var(--red));
}
.timer-num {
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  font-size:0.7rem; font-weight:900; color:var(--text);
}
.timer-info { flex:1; }
.timer-label { font-size:0.72rem; font-weight:700; color:var(--text2); }
.timer-sub { font-size:0.58rem; color:var(--text3); margin-top:1px; }
.timer-live {
  display:flex; align-items:center; gap:5px;
  font-size:0.56rem; font-weight:700; color:var(--red);
  letter-spacing:1px; text-transform:uppercase;
}
.timer-live::before {
  content:''; width:5px; height:5px; border-radius:50%;
  background:var(--red); box-shadow:0 0 6px var(--red);
  animation:blink 1s ease-in-out infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

/* section header */
.sec-head {
  display:flex; align-items:center; justify-content:space-between;
}
.sec-title {
  font-size:0.6rem; font-weight:700; letter-spacing:2px;
  text-transform:uppercase; color:var(--text3);
  display:flex; align-items:center; gap:7px;
}
.sec-title::before {
  content:''; width:14px; height:2px;
  background:linear-gradient(90deg, var(--red), var(--gold));
}
.sec-count {
  font-size:0.6rem; font-weight:700; color:var(--text3);
  background:var(--glass2); border:1px solid var(--border);
  padding:2px 9px; border-radius:100px;
}

/* ══ PROMO CARD - COMPACT ══ */
.promo-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r2);
  overflow: hidden;
  animation: cardIn 0.4s cubic-bezier(.34,1.4,.64,1) both;
  animation-delay: calc(var(--ix,0) * 0.06s);
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
@keyframes cardIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
.promo-card:hover {
  transform: translateY(-2px);
  border-color: var(--border2);
  box-shadow: 0 8px 28px rgba(0,0,0,0.4), 0 0 16px rgba(230,0,0,0.07);
}

/* Card layout - horizontal compact */
.card-main {
  display: flex; align-items: center;
  padding: 12px 14px; gap: 12px;
  border-bottom: 1px solid var(--border);
}
.card-amount-col {
  display:flex; flex-direction:column; align-items:center;
  background: rgba(230,0,0,0.07);
  border: 1px solid rgba(230,0,0,0.12);
  border-radius: 12px;
  padding: 8px 14px;
  min-width: 72px; flex-shrink:0;
}
.card-amount-big { font-family:'Bebas Neue',sans-serif; font-size:2.2rem; color:#fff; line-height:1; }
.card-amount-unit { font-size:0.52rem; font-weight:700; color:var(--text3); margin-top:1px; letter-spacing:0.5px; }

.card-chips-col {
  flex:1; display:flex; flex-direction:column; gap:5px; align-items:flex-start;
}
.chip {
  display:inline-flex; align-items:center; gap:4px;
  padding:3px 9px; border-radius:100px;
  font-size:0.58rem; font-weight:700;
}
.chip-gold {
  background:rgba(201,168,76,0.08); color:var(--gold2);
  border:1px solid rgba(201,168,76,0.18);
}
.chip-blue {
  background:rgba(99,179,237,0.06); color:#63b3ed;
  border:1px solid rgba(99,179,237,0.12);
}
.chip i { font-size:0.52rem; }

.card-serial-row {
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between;
  background: rgba(0,0,0,0.25);
  gap: 10px;
}
.serial-code {
  font-family:monospace; font-size:0.88rem; letter-spacing:2.5px;
  color:var(--text); font-weight:600; flex:1; text-align:right;
}
.copy-btn {
  width:28px; height:28px; border-radius:8px;
  background:var(--glass); border:1px solid var(--border);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all 0.2s; flex-shrink:0;
  color:var(--text3);
}
.copy-btn:hover { background:rgba(230,0,0,0.1); border-color:var(--border2); color:var(--red); }
.copy-btn:active { transform:scale(0.85); }
.copy-btn i { font-size:0.68rem; }

.card-actions {
  display:flex; gap:7px; padding:8px 10px;
}
.act-btn {
  flex:1; display:flex; align-items:center; justify-content:center; gap:5px;
  padding:9px 6px; border:none; border-radius:10px;
  font-family:'Cairo',sans-serif; font-size:0.72rem; font-weight:800;
  cursor:pointer; text-decoration:none;
  transition:all 0.2s cubic-bezier(.34,1.4,.64,1);
  position:relative; overflow:hidden;
}
.act-charge {
  background: var(--red);
  color:#fff;
  box-shadow: 0 3px 12px var(--red-glow);
}
.act-charge::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.12),transparent 50%);
}
.act-charge:hover { transform:translateY(-1px); box-shadow:0 6px 20px var(--red-glow); }
.act-charge.loading { opacity:0.6; pointer-events:none; }
.act-dial {
  background:var(--glass2); color:var(--text2);
  border:1px solid var(--border);
}
.act-dial:hover { background:var(--glass); color:var(--text); border-color:rgba(255,255,255,0.12); }
.act-btn:active { transform:scale(0.95) !important; }
.act-btn i { font-size:0.72rem; position:relative; z-index:1; }
.act-btn span { position:relative; z-index:1; }

/* empty */
.empty-state {
  text-align:center; padding:40px 20px;
  background:var(--bg3); border:1px solid var(--border); border-radius:var(--r2);
}
.empty-state .empty-icon { font-size:2.2rem; color:var(--text3); margin-bottom:12px; display:block; }
.empty-state p { font-size:0.82rem; color:var(--text2); }
.empty-state small { font-size:0.64rem; color:var(--text3); margin-top:5px; display:block; }

/* toast */
.toast {
  position:fixed; bottom:90px; left:50%;
  transform:translateX(-50%) translateY(16px);
  background:rgba(15,15,15,0.95);
  border:1px solid var(--border);
  border-radius:100px; padding:9px 20px;
  font-family:'Cairo',sans-serif; font-size:0.72rem; font-weight:700;
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
  font-size:0.52rem; font-weight:700; letter-spacing:0.5px;
}
.bot-nav a:hover { color:var(--red); transform:translateY(-3px); }
.bot-nav i { font-size:1.3rem; }
</style>
</head>
<body oncontextmenu="return false;">

<!-- ══ SPLASH SCREEN ══ -->
<div id="SPLASH">
  <!-- Stars -->
  <div class="splash-stars" id="STARS"></div>

  <!-- Moon crescent SVG -->
  <div class="splash-moon">
    <svg class="moon-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Crescent using clip path -->
      <defs>
        <clipPath id="moonClip">
          <circle cx="50" cy="50" r="42"/>
        </clipPath>
      </defs>
      <!-- Full moon circle -->
      <circle cx="50" cy="50" r="42" fill="url(#moonGrad)"/>
      <!-- Cut out to make crescent -->
      <circle cx="68" cy="42" r="36" fill="#000" clip-path="url(#moonClip)"/>
      <!-- Glow ring -->
      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(201,168,76,0.3)" stroke-width="1"/>
      <!-- Star near moon -->
      <polygon points="82,20 83.5,24.5 88,24.5 84.5,27.2 85.8,32 82,29.2 78.2,32 79.5,27.2 76,24.5 80.5,24.5"
               fill="rgba(240,208,128,0.9)"/>
      <defs>
        <radialGradient id="moonGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#f0d080"/>
          <stop offset="40%"  stop-color="#c9a84c"/>
          <stop offset="100%" stop-color="#8a6820"/>
        </radialGradient>
      </defs>
    </svg>
  </div>

  <!-- App Icon -->
  <div class="splash-icon">
    <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt="VF">
  </div>

  <!-- App Name -->
  <div class="splash-name">TALASHNY</div>
  <div class="splash-tagline">عروض فودافون · رمضان كريم</div>

  <!-- Loading dots -->
  <div class="splash-dots">
    <div class="splash-dot"></div>
    <div class="splash-dot"></div>
    <div class="splash-dot"></div>
  </div>

  <!-- VF Badge -->
  <div class="splash-vf-badge">
    <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt="">
    <span>VODAFONE EGYPT</span>
  </div>
</div>

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
    <div class="hero-deco">☽</div>
    <div class="hero-deco2">✦</div>
    <div class="hero-vf">
      <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt="VF">
    </div>
    <div class="hero-title">ماتخليش حاجة <em>تفوتك</em></div>
    <div class="hero-sub">كروت رمضان &nbsp;·&nbsp; فرصة &nbsp;·&nbsp; ننور بعض</div>
  </div>

  {% if error %}
  <div class="err-box">
    <i class="fas fa-circle-exclamation"></i>
    <span>{{ error }}</span>
  </div>
  {% endif %}

  <div class="form-card">
    <div class="form-card-header">
      <div class="form-card-title">تسجيل الدخول بحسابك</div>
    </div>
    <form method="POST" action="/login" id="LOGIN_FORM">
      <input type="hidden" name="method" value="password">
      <div style="display:flex;flex-direction:column;gap:11px;">
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
        <div class="secure-note">
          <i class="fas fa-shield-halved"></i>
          اتصال مشفر وآمن
        </div>
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
        <circle class="timer-bg" cx="20" cy="20" r="16"/>
        <circle class="timer-prog" id="PROG" cx="20" cy="20" r="16"/>
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
// ══ SPLASH ══
(function(){
  // Generate stars
  const starsEl = document.getElementById('STARS');
  if(starsEl){
    for(let i=0;i<80;i++){
      const s=document.createElement('div');
      s.className='splash-star';
      s.style.cssText=`
        left:${Math.random()*100}%;
        top:${Math.random()*100}%;
        width:${Math.random()*2+1}px;
        height:${Math.random()*2+1}px;
        --d:${Math.random()*2+1.5}s;
        --dl:${Math.random()*3}s;
        opacity:${Math.random()*0.6+0.1};
      `;
      starsEl.appendChild(s);
    }
  }

  // Hide splash after delay
  const splash = document.getElementById('SPLASH');
  if(splash){
    setTimeout(()=>{
      splash.classList.add('hide');
      setTimeout(()=>{ splash.style.display='none'; }, 650);
    }, 2200);
  }
})();

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
const TOTAL=15, CIRC=2*Math.PI*16;
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
      <div class="card-main">
        <div class="card-amount-col">
          <div class="card-amount-big">${esc(p.amount)}</div>
          <div class="card-amount-unit">جنيه</div>
        </div>
        <div class="card-chips-col">
          <span class="chip chip-gold"><i class="fas fa-gift"></i>${esc(p.gift)} وحدة هدية</span>
          <span class="chip chip-blue"><i class="fas fa-rotate"></i>${esc(p.remaining)} باقي</span>
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
