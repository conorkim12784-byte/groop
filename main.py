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
    headers = {
        "User-Agent": "okhttp/4.12.0",
        "Connection": "Keep-Alive",
        "x-agent-operatingsystem": "13",
        "clientId": "AnaVodafoneAndroid",
        "Accept-Language": "ar",
        "x-agent-device": "Xiaomi 21061119AG",
        "x-agent-version": "2025.10.3",
        "x-agent-build": "1050",
        "digitalId": "28RI9U7ISU8SW",
        "device-id": "1df4efae59648ac3",
    }
    if client_ip:
        headers["X-Forwarded-For"] = client_ip
        headers["X-Real-IP"] = client_ip

    try:
        r1 = req.get(
            "http://mobile.vodafone.com.eg/checkSeamless/realms/vf-realm/protocol/openid-connect/auth",
            params={"client_id": "cash-app"},
            headers=headers, timeout=20, verify=False
        )
        s1 = r1.json()
    except Exception as e:
        return {"_error": f"step1: {e}"}

    if "seamlessToken" not in s1 or "msisdn" not in s1:
        return {"_error": "no_seamless", "_raw": s1}

    number = "0" + str(s1["msisdn"])
    fox = s1["seamlessToken"]

    try:
        r2 = req.post(
            "https://mobile.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/token",
            data={
                "grant_type": "password",
                "client_secret": "b86e30a8-ae29-467a-a71f-65c73f2ff5e3",
                "client_id": "cash-app",
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "okhttp/4.12.0",
                "silentLogin": "true", "CRP": "false",
                "seamlessToken": fox, "firstTimeLogin": "true",
                "x-agent-operatingsystem": "13", "clientId": "AnaVodafoneAndroid",
                "Accept-Language": "ar", "x-agent-device": "Xiaomi 21061119AG",
                "x-agent-version": "2025.10.3", "x-agent-build": "1050",
                "digitalId": "", "device-id": "1df4efae59648ac3",
            },
            timeout=20, verify=False
        )
        data = r2.json()
    except Exception as e:
        return {"_error": f"step2: {e}"}

    if "access_token" in data:
        data["_number"] = number
        return data
    return {"_error": "no_token", "_raw": data}

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
<title>TALASHNY - عروض فودافون</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;900&display=swap" rel="stylesheet"/>
<style>
:root{
    --red:#e60000;--red-dark:#b50000;--red-alpha:rgba(230,0,0,0.08);
    --green:#22c55e;--text:#0f0f0f;--text2:#6b7280;--text3:#9ca3af;
    --bg:#f5f5f7;--card:#ffffff;--border:rgba(0,0,0,0.06);
    --r:14px;--r2:20px;--r3:100px;
    --sp:cubic-bezier(.34,1.4,.64,1);--sm:cubic-bezier(.4,0,.2,1);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow-x:hidden}
body{font-family:'Cairo',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding-top:170px;padding-bottom:90px}

.banner{position:fixed;top:0;left:0;right:0;height:95px;background:#000;display:flex;justify-content:center;align-items:center;font-size:2.8rem;font-weight:900;letter-spacing:6px;text-transform:uppercase;box-shadow:0 6px 40px rgba(0,0,0,0.8);z-index:1000;border-bottom-left-radius:60% 40%;border-bottom-right-radius:60% 40%;overflow:hidden;gap:5px}
.banner span{display:inline-block;color:transparent;background:linear-gradient(90deg,#c0c0c0 0%,#fff 20%,#e0e0e0 40%,#fff 60%,#b0b0b0 80%,#c0c0c0 100%);background-size:400% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:chrome-shine 4s linear infinite;animation-delay:calc(var(--i)*0.18s)}
@keyframes chrome-shine{0%{background-position:400% center}100%{background-position:-400% center}}
.small-logo-under-banner{position:fixed;top:100px;left:51%;transform:translateX(-50%);z-index:999;margin-top:8px}
.small-logo-under-banner img{width:38px;height:auto;display:block;filter:drop-shadow(0 1px 4px rgba(0,0,0,0.6))}
.ramadan-decoration{position:fixed;top:85px;left:0;right:0;height:170px;pointer-events:none;z-index:999;display:flex;justify-content:space-between;align-items:flex-start;padding:0 2px}
.garland-left,.garland-right{max-width:45%;max-height:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5))}
.garland-left{animation:swing-left 24s infinite ease-in-out;transform-origin:top left}
.garland-right{animation:swing-right 26s infinite ease-in-out;transform-origin:top right}
@keyframes swing-left{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-1.5deg)}}
@keyframes swing-right{0%,100%{transform:rotate(0deg)}50%{transform:rotate(1.5deg)}}
.wrap{max-width:480px;margin:0 auto;padding:0 16px}
.login-page{animation:fadeUp .4s var(--sp) both}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.lp-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#1a1a1a 0%,#2a0000 60%,#1a1a1a 100%);border-radius:22px;padding:22px 18px 20px;margin-bottom:14px;border:1px solid rgba(230,0,0,.2);box-shadow:0 4px 24px rgba(0,0,0,.15)}
.lp-hero::before{content:'';position:absolute;top:-40px;left:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(230,0,0,.3),transparent 70%);pointer-events:none}
.lp-hero-row{display:flex;align-items:center;gap:14px;position:relative;z-index:1}
.lp-logo-img{width:54px;height:54px;border-radius:16px;object-fit:contain;display:block;background:rgba(255,255,255,.08);padding:4px}
.lp-title{font-size:1.15rem;font-weight:900;color:#fff;line-height:1.25;margin-bottom:4px}
.lp-title span{color:#ff4444}
.lp-sub{font-size:.71rem;color:rgba(255,255,255,.45);line-height:1.6}
.lp-err{display:flex;align-items:center;gap:8px;background:#fff5f5;border:1px solid rgba(230,0,0,.14);border-radius:var(--r);padding:10px 13px;margin-bottom:12px;font-size:.75rem;font-weight:700;color:#c00;word-break:break-all}
.lp-err i{color:var(--red);font-size:.82rem;flex-shrink:0}
.seg{display:flex;background:rgba(0,0,0,.06);border-radius:var(--r3);padding:3px;margin-bottom:14px;gap:2px}
.seg-btn{flex:1;padding:8px 6px;border:none;border-radius:var(--r3);font-family:'Cairo',sans-serif;font-size:.74rem;font-weight:700;color:var(--text2);background:transparent;cursor:pointer;transition:all .22s var(--sm);display:flex;align-items:center;justify-content:center;gap:5px}
.seg-btn i{font-size:.7rem}
.seg-btn.on{background:var(--red);color:#fff;box-shadow:0 2px 10px rgba(230,0,0,.32)}
.lp-form{display:none;flex-direction:column;gap:11px}
.lp-form.show{display:flex}
.inp-group{background:var(--card);border-radius:16px;overflow:hidden;border:1.5px solid var(--border);box-shadow:0 1px 8px rgba(0,0,0,.04)}
.inp-row{display:flex;align-items:center;position:relative}
.inp-row+.inp-row{border-top:1px solid var(--border)}
.inp-row::after{content:'';position:absolute;right:0;top:8px;bottom:8px;width:0;background:var(--red);border-radius:2px;transition:width .16s var(--sm)}
.inp-row:focus-within::after{width:2.5px}
.inp-ico{width:46px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.inp-ico i{font-size:.9rem;color:var(--red)}
.inp-body{flex:1;padding:12px 14px 12px 0;display:flex;flex-direction:column}
.inp-lbl{font-size:.46rem;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:var(--text3);margin-bottom:2px;transition:color .2s}
.inp-row:focus-within .inp-lbl{color:var(--red)}
.inp-body input{background:none;border:none;outline:none;font-family:'Cairo',sans-serif;font-size:.88rem;font-weight:600;color:var(--text);width:100%}
.inp-body input::placeholder{color:#d1d5db;font-weight:400;font-size:.78rem}
.data-info{background:var(--card);border-radius:16px;border:1.5px solid var(--border);padding:14px;display:flex;gap:11px;align-items:flex-start;box-shadow:0 1px 8px rgba(0,0,0,.04)}
.data-info-ico{width:38px;height:38px;border-radius:11px;background:var(--red-alpha);border:1px solid rgba(230,0,0,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.data-info-ico i{font-size:.95rem;color:var(--red)}
.data-info-txt strong{display:block;font-size:.8rem;font-weight:800;color:var(--text);margin-bottom:3px}
.data-info-txt p{font-size:.7rem;color:var(--text2);line-height:1.85}
.lp-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:13px;border:none;border-radius:16px;font-family:'Cairo',sans-serif;font-size:.88rem;font-weight:800;color:#fff;cursor:pointer;position:relative;overflow:hidden;transition:transform .25s var(--sp),box-shadow .25s,opacity .2s}
.lp-btn.pass{background:var(--red);box-shadow:0 4px 18px rgba(230,0,0,.3)}
.lp-btn.data{background:#1a1a1a;box-shadow:0 4px 14px rgba(0,0,0,.2)}
.lp-btn:hover{transform:translateY(-1px)}
.lp-btn:active{transform:scale(.97)!important}
.lp-btn:disabled{opacity:.55;cursor:wait}
.lp-btn i{font-size:.84rem}
.u-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.u-bar-left{display:flex;align-items:center;gap:10px}
.u-avatar{width:36px;height:36px;border-radius:10px;background:rgba(0,0,0,.05);border:1px solid rgba(0,0,0,.07);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.u-avatar i{font-size:.82rem;color:var(--text2)}
.u-dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 5px rgba(34,197,94,.6);margin-left:5px;flex-shrink:0}
.u-num{font-size:.88rem;font-weight:800;color:var(--text)}
.u-type{font-size:.6rem;color:var(--text3);display:flex;align-items:center;gap:3px;margin-top:1px}
.btn-out{display:flex;align-items:center;gap:5px;background:transparent;border:1px solid var(--border);border-radius:var(--r3);padding:6px 12px;font-family:'Cairo',sans-serif;font-size:.7rem;font-weight:700;color:var(--text2);cursor:pointer;transition:all .2s;text-decoration:none}
.btn-out:hover{border-color:rgba(230,0,0,.3);color:var(--red);background:var(--red-alpha)}
.timer-strip{display:flex;align-items:center;gap:10px;background:var(--card);border-radius:var(--r);border:1px solid var(--border);padding:10px 14px;margin-bottom:16px}
.timer-ring{width:36px;height:36px;position:relative;flex-shrink:0}
.timer-ring svg{width:36px;height:36px;transform:rotate(-90deg)}
.timer-ring .bg{fill:none;stroke:#f0f0f0;stroke-width:3}
.timer-ring .prog{fill:none;stroke:var(--red);stroke-width:3;stroke-linecap:round;stroke-dasharray:100;stroke-dashoffset:0;transition:stroke-dashoffset .9s linear,stroke .3s}
.timer-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:900;color:var(--text)}
.timer-txt{flex:1}
.timer-label{font-size:.75rem;font-weight:700;color:var(--text2)}
.timer-sub{font-size:.62rem;color:var(--text3);margin-top:1px}
.timer-dot{width:7px;height:7px;border-radius:50%;background:var(--red);box-shadow:0 0 6px rgba(230,0,0,.7);animation:blink 1.2s ease-in-out infinite;flex-shrink:0}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
.promo-card{background:var(--card);border-radius:var(--r2);border:1px solid var(--border);overflow:hidden;margin-bottom:12px;animation:cardIn .4s var(--sp) both;animation-delay:calc(var(--ix,0)*.08s);transition:transform .2s var(--sp),box-shadow .2s}
@keyframes cardIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.promo-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.09)}
.card-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 12px;border-bottom:1px solid var(--border)}
.card-amount{display:flex;align-items:baseline;gap:4px}
.card-amount-val{font-size:1.6rem;font-weight:900;color:var(--text);line-height:1}
.card-amount-unit{font-size:.72rem;font-weight:700;color:var(--text2)}
.card-badges{display:flex;align-items:center;gap:6px}
.badge{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border-radius:100px;font-size:.65rem;font-weight:700}
.badge-gift{background:rgba(249,202,36,.12);color:#d4a400;border:1px solid rgba(249,202,36,.25)}
.badge-remain{background:rgba(99,179,237,.1);color:#3182ce;border:1px solid rgba(99,179,237,.2)}
.badge i{font-size:.6rem}
.card-serial{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid var(--border);background:#fafafa}
.serial-val{font-family:monospace;font-size:.88rem;letter-spacing:2px;color:var(--text);font-weight:600}
.copy-btn{width:30px;height:30px;border-radius:8px;background:transparent;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s var(--sp);flex-shrink:0}
.copy-btn i{font-size:.78rem;color:var(--text3)}
.copy-btn:hover{background:var(--red-alpha);border-color:rgba(230,0,0,.2)}
.copy-btn:hover i{color:var(--red)}
.copy-btn:active{transform:scale(.88)}
.card-actions{display:flex;padding:10px;gap:8px}
.btn-act{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 6px;border:none;border-radius:10px;font-family:'Cairo',sans-serif;font-size:.78rem;font-weight:700;cursor:pointer;text-decoration:none;transition:all .2s var(--sp);position:relative;overflow:hidden}
.btn-act.online{background:var(--red);color:#fff}
.btn-act.online:hover{background:var(--red-dark);transform:translateY(-1px)}
.btn-act.online.loading{opacity:.6;pointer-events:none}
.btn-act.dial{background:#f5f5f7;color:var(--text);border:1px solid var(--border)}
.btn-act.dial:hover{background:#ebebed}
.btn-act:active{transform:scale(.95)!important}
.btn-act i{font-size:.78rem}
.sec-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.sec-title{font-size:.72rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3)}
.sec-count{font-size:.68rem;font-weight:700;color:var(--text3);background:rgba(0,0,0,.05);padding:2px 8px;border-radius:100px}
.no-cards{text-align:center;padding:32px 20px;background:var(--card);border-radius:var(--r2);border:1px solid var(--border)}
.no-cards i{font-size:1.8rem;color:#e0e0e0;display:block;margin-bottom:10px}
.no-cards p{font-size:.85rem;color:var(--text2)}
.no-cards small{font-size:.7rem;color:var(--text3);display:block;margin-top:5px}
.toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(10px);background:rgba(10,10,10,.95);border:1px solid rgba(255,255,255,.07);border-radius:100px;padding:9px 20px;font-family:'Cairo',sans-serif;font-size:.76rem;font-weight:700;color:#fff;opacity:0;pointer-events:none;z-index:1100;white-space:nowrap;transition:all .28s var(--sp);backdrop-filter:blur(10px)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.toast.ok{border-color:rgba(34,197,94,.3);color:#4ade80}
.toast.err{border-color:rgba(230,0,0,.3);color:#f87171}
.bot-nav{position:fixed;bottom:0;left:0;right:0;background:rgba(255,255,255,.88);backdrop-filter:blur(20px);border-top:1px solid rgba(0,0,0,.06);display:flex;justify-content:space-around;padding:10px 0 14px;z-index:999}
.bot-nav a{text-decoration:none;color:#9ca3af;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 22px;border-radius:10px;transition:color .2s,transform .2s var(--sp)}
.bot-nav a:hover{color:var(--red);transform:translateY(-3px)}
.bot-nav i{font-size:1.6rem}
</style>
</head>
<body oncontextmenu="return false;">

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
<div class="login-page">
    <div class="lp-hero">
        <div class="lp-hero-row">
            <div><img src="https://tlashane.serv00.net/vo/vodafone2.png" alt="TALASHNY" class="lp-logo-img"></div>
            <div>
                <div class="lp-title">ماتخليش حاجة <span>تفوتك</span></div>
                <div class="lp-sub">كروت رمضان · فرصة · ننور بعض</div>
            </div>
        </div>
    </div>

    {% if error %}
    <div class="lp-err">
        <i class="fas fa-circle-exclamation"></i>
        {{ error }}
    </div>
    {% endif %}

    <div class="seg">
        <button class="seg-btn on" id="TAB_PASS" onclick="switchTab('pass')">
            <i class="fas fa-lock"></i> رقم وباسورد
        </button>
        <button class="seg-btn" id="TAB_DATA" onclick="switchTab('data')">
            <i class="fas fa-wifi"></i> بيانات الجهاز
        </button>
    </div>

    <form method="POST" action="/login" id="FORM_PASS" class="lp-form show">
        <input type="hidden" name="method" value="password">
        <div class="inp-group">
            <div class="inp-row">
                <div class="inp-ico"><i class="fas fa-mobile-screen-button"></i></div>
                <div class="inp-body">
                    <span class="inp-lbl">رقم الموبايل</span>
                    <input type="tel" name="number" placeholder="01XXXXXXXXX" inputmode="tel" autocomplete="tel" required value="{{ prefill_number }}">
                </div>
            </div>
            <div class="inp-row">
                <div class="inp-ico"><i class="fas fa-key"></i></div>
                <div class="inp-body">
                    <span class="inp-lbl">كلمة المرور</span>
                    <input type="password" name="password" placeholder="••••••••" autocomplete="current-password" required>
                </div>
            </div>
        </div>
        <button type="submit" class="lp-btn pass" id="BTN_PASS">
            <i class="fas fa-right-to-bracket"></i>
            <span>تسجيل الدخول</span>
        </button>
    </form>

    <div id="FORM_DATA" class="lp-form">
        <div class="data-info">
            <div class="data-info-ico"><i class="fas fa-tower-broadcast"></i></div>
            <div class="data-info-txt">
                <strong>تسجيل الدخول بداتا الجهاز</strong>
                <p>تأكد إن الداتا شغالة على الخط. السيستم هيجيب بياناتك تلقائياً من شبكة فودافون بدون ما تكتب حاجة.</p>
            </div>
        </div>
        <button type="button" class="lp-btn data" id="BTN_DATA" onclick="doDataLogin()">
            <i class="fas fa-signal"></i>
            <span>دخول بالداتا</span>
        </button>
    </div>
</div>

{% else %}
<div id="APP">
    <div class="u-bar">
        <div class="u-bar-left">
            <div class="u-avatar"><i class="fas fa-sim-card"></i></div>
            <div>
                <div style="display:flex;align-items:center">
                    <div class="u-dot"></div>
                    <span class="u-num">{{ number }}</span>
                </div>
                <div class="u-type">
                    {% if login_method == 'data' %}
                        <i class="fas fa-wifi"></i> داتا الجهاز
                    {% else %}
                        <i class="fas fa-lock"></i> رقم وباسورد
                    {% endif %}
                </div>
            </div>
        </div>
        <a href="/logout" class="btn-out"><i class="fas fa-power-off"></i> خروج</a>
    </div>

    <div class="timer-strip">
        <div class="timer-ring">
            <svg viewBox="0 0 36 36">
                <circle class="bg" cx="18" cy="18" r="15.9"/>
                <circle class="prog" id="PROG" cx="18" cy="18" r="15.9"/>
            </svg>
            <div class="timer-num" id="TNUM">15</div>
        </div>
        <div class="timer-txt">
            <div class="timer-label">تحديث تلقائي</div>
            <div class="timer-sub">يتجدد كل 15 ثانية</div>
        </div>
        <div class="timer-dot"></div>
    </div>

    <div class="sec-head">
        <span class="sec-title">الكروت المتاحة</span>
        <span class="sec-count" id="CCOUNT">—</span>
    </div>
    <div id="CARDS">
        <div class="no-cards">
            <i class="fas fa-spinner fa-spin" style="color:var(--red)"></i>
            <p>جاري تحميل الكروت...</p>
        </div>
    </div>
</div>
{% endif %}
</div>

<div class="toast" id="TOAST"></div>

<div class="bot-nav">
    <a href="https://t.me/FY_TF" target="_blank"><i class="fab fa-telegram-plane"></i></a>
    <a href="https://wa.me/message/U6AIKBGFCNCQK1" target="_blank"><i class="fab fa-whatsapp"></i></a>
    <a href="https://www.facebook.com/VI808IV" target="_blank"><i class="fab fa-facebook-f"></i></a>
</div>

<script>
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function toast(msg,t=''){
    const el=document.getElementById('TOAST');
    el.textContent=msg;el.className='toast show'+(t?' '+t:'');
    clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2700);
}
function switchTab(tab){
    document.getElementById('TAB_PASS').classList.toggle('on',tab==='pass');
    document.getElementById('TAB_DATA').classList.toggle('on',tab==='data');
    document.getElementById('FORM_PASS').classList.toggle('show',tab==='pass');
    document.getElementById('FORM_DATA').classList.toggle('show',tab==='data');
}
document.querySelectorAll('form').forEach(f=>{
    f.addEventListener('submit',function(){
        const b=this.querySelector('.lp-btn');
        if(b){b.disabled=true;b.querySelector('span').textContent='جاري التحقق...';}
    });
});

async function doDataLogin(){
    const btn=document.getElementById('BTN_DATA');
    btn.disabled=true;
    btn.querySelector('span').textContent='جاري الاتصال بفودافون...';
    btn.querySelector('i').className='fas fa-spinner fa-spin';
    try{
        const r=await fetch('/data_login',{method:'POST'});
        const d=await r.json();
        if(d.ok){
            btn.querySelector('span').textContent='✅ تم!';
            btn.querySelector('i').className='fas fa-check';
            setTimeout(()=>location.reload(),400);
        }else{
            throw new Error(JSON.stringify(d.err??d));
        }
    }catch(e){
        btn.disabled=false;
        btn.querySelector('span').textContent='دخول بالداتا';
        btn.querySelector('i').className='fas fa-signal';
        let errEl=document.querySelector('.lp-err');
        if(!errEl){
            errEl=document.createElement('div');
            errEl.className='lp-err';
            errEl.innerHTML='<i class="fas fa-circle-exclamation"></i><span></span>';
            document.querySelector('.seg').before(errEl);
        }
        errEl.querySelector('span').textContent=e.message||String(e);
        errEl.style.display='flex';
    }
}

function copySerial(btn){
    const s=btn.closest('.card-serial').querySelector('.serial-val').textContent.trim();
    const ok=()=>{
        const orig=btn.innerHTML;
        btn.innerHTML='<i class="fas fa-check" style="color:var(--red)"></i>';
        setTimeout(()=>{btn.innerHTML=orig},1600);
        toast('✅ تم نسخ الكود','ok');
    };
    if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(s).then(ok).catch(()=>fb());
    else fb();
    function fb(){const t=document.createElement('textarea');t.value=s;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch(e){}document.body.removeChild(t);ok()}
}

async function chargeOnline(serial,btn){
    btn.classList.add('loading');
    btn.innerHTML='<i class="fas fa-spinner fa-spin"></i><span> جاري...</span>';
    try{
        const r=await fetch('/redeem?serial='+encodeURIComponent(serial));
        const d=await r.json();
        if(d.ok){
            toast('✅ تم شحن الكارت بنجاح','ok');
            btn.innerHTML='<i class="fas fa-check"></i><span>تم الشحن</span>';
            btn.style.background='var(--green)';
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
const TOTAL_SECS=15;
const CIRC=2*Math.PI*15.9;
let TI=null;

function renderCards(promos){
    const el=document.getElementById('CARDS');
    const cc=document.getElementById('CCOUNT');
    if(!promos||!promos.length){
        if(cc)cc.textContent='0';
        el.innerHTML='<div class="no-cards"><i class="fas fa-box-open"></i><p>لا توجد عروض متاحة حالياً</p><small>جاري البحث تلقائياً...</small></div>';
        return;
    }
    if(cc)cc.textContent=promos.length+' كرت';
    let h='';
    promos.forEach((p,i)=>{
        const ussd='*858*'+p.serial.replace(/\s/g,'')+'#';
        const tel='tel:'+encodeURIComponent(ussd);
        h+=`<div class="promo-card" style="--ix:${i}">
            <div class="card-head">
                <div class="card-amount">
                    <span class="card-amount-val">${esc(p.amount)}</span>
                    <span class="card-amount-unit">جنيه</span>
                </div>
                <div class="card-badges">
                    <span class="badge badge-gift"><i class="fas fa-gift"></i>${esc(p.gift)} وحدة</span>
                    <span class="badge badge-remain"><i class="fas fa-hourglass-half"></i>${esc(p.remaining)}</span>
                </div>
            </div>
            <div class="card-serial">
                <span class="serial-val">${esc(p.serial)}</span>
                <button onclick="copySerial(this)" class="copy-btn"><i class="fas fa-clone"></i></button>
            </div>
            <div class="card-actions">
                <button class="btn-act online" onclick="chargeOnline('${esc(p.serial)}',this)">
                    <i class="fas fa-bolt"></i><span>شحن أونلاين</span>
                </button>
                <a href="${tel}" class="btn-act dial">
                    <i class="fas fa-phone"></i><span>شحن هاتف</span>
                </a>
            </div>
        </div>`;
    });
    el.innerHTML=h;
}

function startTimer(done){
    let t=TOTAL_SECS;
    const num=document.getElementById('TNUM');
    const prog=document.getElementById('PROG');
    if(!num||!prog)return;
    prog.style.strokeDasharray=CIRC;
    prog.style.strokeDashoffset=0;
    clearInterval(TI);
    TI=setInterval(()=>{
        t--;
        if(num)num.textContent=Math.max(t,0);
        prog.style.strokeDashoffset=CIRC*(1-t/TOTAL_SECS);
        prog.style.stroke=t<=5?'#ff4444':'var(--red)';
        if(t<=0){clearInterval(TI);setTimeout(done,300);}
    },1000);
}

async function fetchCards(){
    try{
        const r=await fetch('/fetch?t='+Date.now());
        const d=await r.json();
        if(d.ok)renderCards(d.promos);
    }catch(e){}
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
