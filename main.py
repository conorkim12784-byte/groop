#!/usr/bin/env python3
"""
TALASHNY - عروض فودافون
pip install flask requests
python talashny.py → http://localhost:5000
"""
try:
    from flask import Flask, request, session, jsonify, render_template_string
    import requests as req
except ImportError:
    import os; os.system("pip install flask requests -q")
    from flask import Flask, request, session, jsonify, render_template_string
    import requests as req

import time, urllib3
urllib3.disable_warnings()

app = Flask(__name__)
app.secret_key = "vf_talashny_2025"

def api_login(number, password):
    try:
        r = req.post(
            "https://mobile.vodafone.com.eg/auth/realms/vf-realm/protocol/openid-connect/token",
            data={"grant_type":"password","username":number,"password":password,
                  "client_secret":"95fd95fb-7489-4958-8ae6-d31a525cd20a","client_id":"ana-vodafone-app"},
            headers={"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json",
                     "User-Agent":"okhttp/4.11.0","clientId":"AnaVodafoneAndroid",
                     "x-agent-operatingsystem":"13","Accept-Language":"ar",
                     "x-agent-device":"Xiaomi 21061119AG","x-agent-version":"2025.10.3",
                     "x-agent-build":"1050","digitalId":"28RI9U7ISU8SW","device-id":"1df4efae59648ac3"},
            timeout=15, verify=False)
        return r.json()
    except: return {}

def api_promos(token, number):
    try:
        r = req.get(
            "https://web.vodafone.com.eg/services/dxl/ramadanpromo/promotion",
            params={"@type":"RamadanHub","channel":"website","msisdn":number},
            headers={"Authorization":f"Bearer {token}","Accept":"application/json",
                     "clientId":"WebsiteConsumer","api-host":"PromotionHost","channel":"WEB",
                     "Accept-Language":"ar","msisdn":number,"Content-Type":"application/json",
                     "User-Agent":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
                     "Referer":"https://web.vodafone.com.eg/ar/ramadan"},
            timeout=15, verify=False)
        dec = r.json()
    except: return []
    cards = []
    if not isinstance(dec, list): return cards
    for item in dec:
        if not isinstance(item, dict) or "pattern" not in item: continue
        for pat in item["pattern"]:
            for act in pat.get("action", []):
                c = {ch["name"]: str(ch["value"]) for ch in act.get("characteristics", [])}
                serial = c.get("CARD_SERIAL","").strip()
                if len(serial) != 13: continue
                cards.append({"serial":serial,"gift":int(c.get("GIFT_UNITS",0)),
                              "amount":int(c.get("amount",0)),"remaining":int(c.get("REMAINING_DEDICATIONS",0))})
    cards.sort(key=lambda x: -x["amount"])
    return cards

def api_redeem(token, number, serial):
    try:
        r = req.post(
            "https://web.vodafone.com.eg/services/dxl/ramadanpromo/promotion",
            json={"@type":"Promo","channel":{"id":"1"},"context":{"type":"RamadanRedeemFromHub"},
                  "pattern":[{"characteristics":[{"name":"cardSerial","value":serial}]}]},
            headers={"Authorization":f"Bearer {token}","Content-Type":"application/json",
                     "Accept":"application/json","clientId":"WebsiteConsumer","channel":"WEB",
                     "msisdn":number,"Accept-Language":"AR",
                     "User-Agent":"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
                     "Origin":"https://web.vodafone.com.eg",
                     "Referer":"https://web.vodafone.com.eg/portal/hub"},
            timeout=15, verify=False)
        return r.status_code
    except: return 0

def do_refresh():
    if time.time() < session.get("token_exp", 0): return True
    res = api_login(session.get("number",""), session.get("password",""))
    if "access_token" in res:
        session["token"] = res["access_token"]
        session["token_exp"] = time.time() + int(res.get("expires_in",3600)) - 120
        return True
    return False

PAGE = r"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>TALASHNY — كروت رمضان</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
<style>
:root{
  --red:#E60000;
  --red2:#CC0000;
  --red3:#FF1A1A;
  --dark:#0A0A0A;
  --dark2:#111111;
  --dark3:#1A1A1A;
  --dark4:#222222;
  --border:rgba(255,255,255,0.07);
  --border2:rgba(230,0,0,0.2);
  --text:#F5F5F5;
  --text2:rgba(255,255,255,0.55);
  --text3:rgba(255,255,255,0.25);
  --gold:#D4A843;
  --green:#00C853;
  --radius:16px;
  --radius-sm:10px;
  --shadow:0 8px 32px rgba(0,0,0,0.6);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{scroll-behavior:smooth}
body{font-family:'Cairo',sans-serif;background:var(--dark);color:var(--text);min-height:100vh;overflow-x:hidden;padding-bottom:90px}

/* ── SPLASH ── */
#splash{
  position:fixed;inset:0;z-index:9999;background:var(--dark);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
}
#splash.out{animation:splashOut .7s ease forwards}
@keyframes splashOut{to{opacity:0;transform:scale(1.03)}}

.splash-logo{
  width:90px;height:90px;border-radius:24px;
  background:linear-gradient(145deg,#1a0000,#0d0d0d);
  border:1px solid rgba(230,0,0,0.25);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 0 12px rgba(230,0,0,0.04), 0 0 60px rgba(230,0,0,0.15);
  opacity:0;transform:scale(0.5);
  animation:logoIn 0.7s cubic-bezier(0.34,1.5,0.64,1) 0.3s forwards;
  position:relative;
}
.splash-logo::before{
  content:'';position:absolute;inset:-1px;border-radius:25px;
  background:linear-gradient(135deg,rgba(230,0,0,0.3),transparent 50%,rgba(230,0,0,0.1));
  z-index:-1;
}
.splash-logo img{width:52px}
@keyframes logoIn{to{opacity:1;transform:scale(1)}}

.splash-ring{
  position:absolute;width:110px;height:110px;border-radius:28px;
  border:1px solid rgba(230,0,0,0.15);
  animation:ringPulse 2s ease-in-out infinite;
}
@keyframes ringPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.08);opacity:1}}

.splash-title{
  margin-top:22px;font-size:2rem;font-weight:900;letter-spacing:8px;
  color:var(--text);opacity:0;transform:translateY(14px);
  animation:fadeUp 0.6s ease 0.9s forwards;
}
.splash-sub{
  font-size:0.75rem;color:var(--text3);letter-spacing:2px;margin-top:4px;
  opacity:0;animation:fadeUp 0.5s ease 1.3s forwards;
}
.splash-bar{
  width:120px;height:2px;border-radius:2px;background:var(--dark3);
  margin-top:32px;overflow:hidden;opacity:0;
  animation:fadeUp 0.4s ease 1.6s forwards;
}
.splash-bar-fill{height:100%;background:var(--red);border-radius:2px;animation:barFill 2s ease 1.8s forwards}
@keyframes barFill{from{width:0}to{width:100%}}
@keyframes fadeUp{to{opacity:1;transform:translateY(0)}}

/* ── PAGES ── */
.page{display:none;position:relative;z-index:10}
.page.active{display:block}

/* ── LOGIN ── */
#login-page{
  min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 20px;
  background:
    radial-gradient(ellipse 70% 50% at 50% 0%, rgba(230,0,0,0.1) 0%, transparent 60%),
    var(--dark);
}
.login-wrap{width:100%;max-width:380px}

.login-header{text-align:center;margin-bottom:32px}
.login-icon{
  width:76px;height:76px;border-radius:20px;margin:0 auto 16px;
  background:linear-gradient(145deg,#1c0000,#0d0d0d);
  border:1px solid rgba(230,0,0,0.2);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 40px rgba(230,0,0,0.12),0 8px 24px rgba(0,0,0,0.5);
}
.login-icon img{width:44px}
.login-title{font-size:1.6rem;font-weight:900;letter-spacing:5px;color:var(--text);margin-bottom:4px}
.login-sub{font-size:0.7rem;color:var(--text3);letter-spacing:1.5px}

.login-card{
  background:var(--dark2);
  border:1px solid var(--border);
  border-radius:20px;padding:24px 20px;
  box-shadow:var(--shadow);
}
.login-card-title{
  font-size:0.6rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--text3);text-align:center;margin-bottom:20px;
  display:flex;align-items:center;gap:10px;justify-content:center;
}
.login-card-title::before,.login-card-title::after{content:'';flex:1;height:1px;background:var(--border)}

.field{margin-bottom:14px}
.field label{
  display:block;font-size:0.6rem;font-weight:700;letter-spacing:1.5px;
  text-transform:uppercase;color:var(--text3);margin-bottom:7px;
  transition:color .2s;
}
.field:focus-within label{color:var(--red)}
.input-wrap{
  display:flex;align-items:center;
  background:var(--dark3);border:1.5px solid var(--border);
  border-radius:var(--radius-sm);overflow:hidden;
  transition:border-color .25s,box-shadow .25s;
}
.field:focus-within .input-wrap{
  border-color:rgba(230,0,0,0.35);
  box-shadow:0 0 0 3px rgba(230,0,0,0.08);
}
.input-wrap input{
  flex:1;background:none;border:none;outline:none;
  font-family:'Cairo',sans-serif;font-size:0.9rem;font-weight:600;color:var(--text);
  padding:13px 14px;direction:rtl;
}
.input-wrap input::placeholder{color:var(--text3);font-weight:400;font-size:0.78rem}
.input-wrap .inp-icon{
  width:44px;text-align:center;font-size:0.78rem;color:var(--text3);
  transition:color .2s;flex-shrink:0;
}
.field:focus-within .inp-icon{color:var(--red)}

.err-box{
  display:flex;align-items:center;gap:9px;
  background:rgba(230,0,0,0.06);border:1px solid rgba(230,0,0,0.18);
  border-radius:10px;padding:11px 14px;margin-bottom:14px;
  font-size:0.72rem;font-weight:700;color:#ff6060;
  animation:shake 0.3s ease;
}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}

.btn-login{
  width:100%;padding:14px;border:none;border-radius:var(--radius-sm);
  background:var(--red);color:#fff;
  font-family:'Cairo',sans-serif;font-size:0.9rem;font-weight:800;
  cursor:pointer;position:relative;overflow:hidden;
  box-shadow:0 4px 20px rgba(230,0,0,0.3);
  transition:transform .2s,box-shadow .2s,background .2s;
  margin-top:4px;
}
.btn-login::before{
  content:'';position:absolute;top:0;left:0;right:0;height:50%;
  background:rgba(255,255,255,0.07);
}
.btn-login:hover{background:var(--red3);transform:translateY(-1px);box-shadow:0 6px 28px rgba(230,0,0,0.4)}
.btn-login:active{transform:scale(0.97)}
.btn-login:disabled{opacity:0.45;cursor:wait;transform:none}

.sec-note{
  display:flex;align-items:center;justify-content:center;gap:5px;
  margin-top:12px;font-size:0.58rem;color:var(--text3);
}
.sec-note i{color:rgba(0,200,90,0.5)}

/* ── TOPBAR ── */
.topbar{
  position:fixed;top:0;left:0;right:0;height:64px;
  background:rgba(10,10,10,0.96);backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 16px;z-index:500;
}
.tbar-brand{display:flex;align-items:center;gap:10px}
.tbar-logo{
  width:36px;height:36px;border-radius:10px;
  background:linear-gradient(135deg,#1a0000,var(--dark3));
  border:1px solid rgba(230,0,0,0.2);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 14px rgba(230,0,0,0.2);
}
.tbar-logo img{width:22px}
.tbar-name{font-size:1rem;font-weight:900;letter-spacing:4px;color:var(--text)}
.tbar-dot{color:var(--red);margin:0 1px}

.tbar-info{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.tbar-num{font-size:0.78rem;font-weight:700;color:var(--text)}
.tbar-status{display:flex;align-items:center;gap:5px;font-size:0.5rem;font-weight:700;color:var(--green)}
.status-dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:pulse2 2s infinite}
@keyframes pulse2{0%,100%{box-shadow:0 0 0 0 rgba(0,200,90,0.5)}70%{box-shadow:0 0 0 5px rgba(0,200,90,0)}}

/* ── APP WRAP ── */
.appwrap{max-width:480px;margin:0 auto;padding:80px 14px 0}

/* ── HEADER ROW ── */
.header-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-top:4px}
.btn-logout{
  display:flex;align-items:center;gap:6px;
  background:var(--dark3);border:1px solid var(--border);
  border-radius:100px;padding:7px 14px;
  font-family:'Cairo',sans-serif;font-size:0.62rem;font-weight:700;
  color:var(--text3);cursor:pointer;transition:all .2s;
}
.btn-logout:hover{border-color:rgba(230,0,0,0.3);color:var(--red);background:rgba(230,0,0,0.05)}

/* ── STATS BAR ── */
.stats-bar{
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;
}
.stat-item{
  background:var(--dark2);border:1px solid var(--border);
  border-radius:var(--radius-sm);padding:12px 10px;text-align:center;
  position:relative;overflow:hidden;
}
.stat-item::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.stat-item.s-red::before{background:var(--red)}
.stat-item.s-gold::before{background:var(--gold)}
.stat-item.s-green::before{background:var(--green)}
.stat-val{font-size:1.35rem;font-weight:900;color:var(--text);line-height:1}
.stat-val.s-red{color:var(--red)}
.stat-val.s-gold{color:var(--gold)}
.stat-val.s-green{color:var(--green)}
.stat-lbl{font-size:0.52rem;font-weight:700;color:var(--text3);letter-spacing:0.5px;margin-top:3px}

/* ── TIMER ── */
.timer-wrap{
  display:flex;align-items:center;gap:12px;
  background:var(--dark2);border:1px solid var(--border);
  border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:14px;
}
.timer-ring{width:38px;height:38px;flex-shrink:0;position:relative}
.timer-ring svg{width:38px;height:38px;transform:rotate(-90deg)}
.t-bg{fill:none;stroke:var(--dark3);stroke-width:3}
.t-prog{
  fill:none;stroke:var(--red);stroke-width:3;stroke-linecap:round;
  stroke-dasharray:100;stroke-dashoffset:0;
  transition:stroke-dashoffset 0.9s linear,stroke 0.3s;
  filter:drop-shadow(0 0 3px rgba(230,0,0,0.6));
}
.timer-count{
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:0.65rem;font-weight:900;color:var(--text);
}
.timer-text{flex:1}
.timer-label{font-size:0.72rem;font-weight:700;color:var(--text2)}
.timer-sub{font-size:0.55rem;color:var(--text3);margin-top:1px}
.live-badge{
  display:flex;align-items:center;gap:5px;
  background:rgba(230,0,0,0.08);border:1px solid rgba(230,0,0,0.2);
  border-radius:100px;padding:4px 10px;
  font-size:0.52rem;font-weight:800;color:var(--red);letter-spacing:1.5px;
}
.live-dot{width:5px;height:5px;border-radius:50%;background:var(--red);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}

/* ── SECTION HEADER ── */
.sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.sec-title{
  font-size:0.6rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--text3);display:flex;align-items:center;gap:8px;
}
.sec-line{width:14px;height:2px;border-radius:2px;background:var(--red)}
.sec-count{
  font-size:0.6rem;font-weight:700;color:var(--text3);
  background:var(--dark3);border:1px solid var(--border);
  padding:3px 10px;border-radius:100px;
}

/* ── CARD ── */
.promo-card{
  background:var(--dark2);border:1px solid var(--border);
  border-radius:var(--radius);margin-bottom:10px;overflow:hidden;
  animation:cardIn 0.35s cubic-bezier(0.34,1.3,0.64,1) both;
  animation-delay:calc(var(--i,0) * 0.06s);
  transition:border-color .2s,transform .2s;
}
.promo-card:hover{border-color:rgba(230,0,0,0.2);transform:translateY(-1px)}
@keyframes cardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

/* شريط علوي ملوّن */
.card-stripe{
  height:3px;
  background:linear-gradient(90deg,var(--red),rgba(230,0,0,0.3),transparent);
}

/* المحتوى الرئيسي */
.card-main{display:flex;align-items:stretch;padding:14px 14px 0}

.card-amount{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-width:68px;padding-left:14px;border-left:1px solid var(--border);margin-left:14px;
}
.amount-num{font-size:2rem;font-weight:900;color:var(--text);line-height:1}
.amount-cur{font-size:0.52rem;font-weight:700;color:var(--text3);letter-spacing:1px;margin-top:2px}

.card-details{flex:1;display:flex;flex-direction:column;gap:7px}
.card-chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{
  display:inline-flex;align-items:center;gap:4px;
  padding:4px 9px;border-radius:100px;
  font-size:0.58rem;font-weight:700;
}
.chip-red{background:rgba(230,0,0,0.07);color:#ff8080;border:1px solid rgba(230,0,0,0.15)}
.chip-gold{background:rgba(212,168,67,0.07);color:#e0b860;border:1px solid rgba(212,168,67,0.15)}
.chip-blue{background:rgba(99,179,237,0.07);color:#80bfdf;border:1px solid rgba(99,179,237,0.12)}
.chip i{font-size:0.5rem}

/* السيريال */
.card-serial{
  display:flex;align-items:center;justify-content:space-between;
  background:var(--dark3);margin:12px 0 0;padding:10px 14px;
  border-top:1px solid var(--border);gap:8px;
}
.serial-num{
  font-family:monospace;font-size:0.9rem;letter-spacing:3px;
  color:var(--text);font-weight:600;flex:1;text-align:right;
}
.btn-copy{
  width:30px;height:30px;border-radius:8px;
  background:var(--dark4);border:1px solid var(--border);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--text3);transition:all .2s;flex-shrink:0;
}
.btn-copy:hover{background:rgba(230,0,0,0.1);border-color:rgba(230,0,0,0.3);color:var(--red)}
.btn-copy:active{transform:scale(0.82)}
.btn-copy i{font-size:0.6rem}

/* أزرار */
.card-actions{display:flex;gap:8px;padding:10px}

.btn-charge{
  flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
  padding:10px 8px;border:none;border-radius:var(--radius-sm);
  background:var(--red);color:#fff;
  font-family:'Cairo',sans-serif;font-size:0.72rem;font-weight:800;
  cursor:pointer;position:relative;overflow:hidden;
  box-shadow:0 3px 12px rgba(230,0,0,0.25);transition:all .2s;
}
.btn-charge::before{content:'';position:absolute;top:0;left:0;right:0;height:50%;background:rgba(255,255,255,0.06)}
.btn-charge:hover{background:var(--red3);box-shadow:0 5px 18px rgba(230,0,0,0.35);transform:translateY(-1px)}
.btn-charge:active{transform:scale(0.96)}
.btn-charge.done{background:#00a040;box-shadow:0 3px 12px rgba(0,160,64,0.3)}
.btn-charge.loading{opacity:0.55;pointer-events:none}

.btn-dial{
  flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
  padding:10px 8px;border-radius:var(--radius-sm);
  background:var(--dark3);border:1px solid var(--border);
  color:var(--text2);font-family:'Cairo',sans-serif;font-size:0.72rem;font-weight:800;
  cursor:pointer;text-decoration:none;transition:all .2s;
}
.btn-dial:hover{background:var(--dark4);color:var(--text);border-color:rgba(255,255,255,0.12)}
.btn-dial:active{transform:scale(0.96)}

/* ── EMPTY ── */
.empty-state{
  text-align:center;padding:48px 20px;
  background:var(--dark2);border:1px solid var(--border);border-radius:var(--radius);
}
.empty-icon{font-size:2.2rem;color:var(--text3);margin-bottom:12px;display:block}
.empty-title{font-size:0.85rem;font-weight:700;color:var(--text2)}
.empty-sub{font-size:0.62rem;color:var(--text3);margin-top:5px}

/* ── TOAST ── */
.toast{
  position:fixed;bottom:90px;left:50%;
  transform:translateX(-50%) translateY(12px);opacity:0;
  background:var(--dark2);border:1px solid var(--border);
  border-radius:100px;padding:10px 22px;
  font-family:'Cairo',sans-serif;font-size:0.72rem;font-weight:700;color:var(--text);
  pointer-events:none;z-index:9998;white-space:nowrap;
  backdrop-filter:blur(20px);box-shadow:var(--shadow);
  transition:all .3s cubic-bezier(0.34,1.4,0.64,1);
}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.toast.ok{border-color:rgba(0,200,90,0.3);color:var(--green)}
.toast.err{border-color:rgba(230,0,0,0.3);color:#ff6060}

/* ── BOTTOM NAV ── */
.botnav{
  position:fixed;bottom:0;left:0;right:0;
  background:rgba(10,10,10,0.97);backdrop-filter:blur(20px);
  border-top:1px solid var(--border);
  display:flex;justify-content:space-around;align-items:stretch;
  padding:0;z-index:400;height:64px;
}
.nav-item{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;text-decoration:none;color:var(--text3);
  font-size:0.5rem;font-weight:700;letter-spacing:0.5px;
  border-top:2px solid transparent;
  transition:color .2s,border-color .2s;padding-top:2px;
}
.nav-item:hover{color:var(--red);border-color:var(--red)}
.nav-item i{font-size:1.1rem}

/* ── SCROLLBAR ── */
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:var(--dark)}
::-webkit-scrollbar-thumb{background:rgba(230,0,0,0.3);border-radius:3px}
</style>
</head>
<body>

<!-- ══ SPLASH ══ -->
<div id="splash">
  <div class="splash-logo">
    <div class="splash-ring"></div>
    <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt="">
  </div>
  <div class="splash-title">TALASHNY</div>
  <div class="splash-sub">كروت رمضان &nbsp;·&nbsp; فودافون مصر</div>
  <div class="splash-bar"><div class="splash-bar-fill"></div></div>
</div>

<!-- ══ LOGIN ══ -->
<div id="login-page" class="page">
  <div class="login-wrap">

    <div class="login-header">
      <div class="login-icon">
        <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt="">
      </div>
      <div class="login-title">TALASHNY</div>
      <div class="login-sub">سجّل دخولك بحساب فودافون</div>
    </div>

    <div id="errBox" class="err-box" style="display:none">
      <i class="fas fa-circle-exclamation"></i>
      <span id="errMsg"></span>
    </div>

    <div class="login-card">
      <div class="login-card-title">تسجيل الدخول</div>

      <div class="field">
        <label>رقم الموبايل</label>
        <div class="input-wrap">
          <input type="tel" id="inpNum" placeholder="01XXXXXXXXX" inputmode="tel" autocomplete="tel" required/>
          <span class="inp-icon"><i class="fas fa-mobile-screen-button"></i></span>
        </div>
      </div>

      <div class="field">
        <label>كلمة المرور</label>
        <div class="input-wrap">
          <input type="password" id="inpPw" placeholder="••••••••" autocomplete="current-password" required/>
          <span class="inp-icon"><i class="fas fa-lock"></i></span>
        </div>
      </div>

      <button class="btn-login" id="loginBtn" onclick="doLogin()">
        <i class="fas fa-right-to-bracket"></i>&nbsp; دخول
      </button>
    </div>

    <div class="sec-note"><i class="fas fa-shield-halved"></i> اتصال آمن ومشفر</div>
  </div>
</div>

<!-- ══ APP ══ -->
<div id="app-page" class="page">

  <div class="topbar">
    <div class="tbar-brand">
      <div class="tbar-logo">
        <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt="">
      </div>
      <div class="tbar-name">TALA<span class="tbar-dot">S</span>HNY</div>
    </div>
    <div class="tbar-info">
      <div class="tbar-num" id="topNum">—</div>
      <div class="tbar-status"><div class="status-dot"></div>متصل</div>
    </div>
  </div>

  <div class="appwrap">

    <div class="header-row">
      <div></div>
      <button class="btn-logout" id="logoutBtn">
        <i class="fas fa-power-off"></i> خروج
      </button>
    </div>

    <div class="stats-bar">
      <div class="stat-item s-red">
        <div class="stat-val s-red" id="st-total">—</div>
        <div class="stat-lbl">كروت</div>
      </div>
      <div class="stat-item s-gold">
        <div class="stat-val s-gold" id="st-max">—</div>
        <div class="stat-lbl">أعلى فئة</div>
      </div>
      <div class="stat-item s-green">
        <div class="stat-val s-green" id="st-rem">—</div>
        <div class="stat-lbl">متبقي</div>
      </div>
    </div>

    <div class="timer-wrap">
      <div class="timer-ring">
        <svg viewBox="0 0 40 40">
          <circle class="t-bg" cx="20" cy="20" r="16"/>
          <circle class="t-prog" id="tprog" cx="20" cy="20" r="16"/>
        </svg>
        <div class="timer-count" id="tnum">15</div>
      </div>
      <div class="timer-text">
        <div class="timer-label">تحديث تلقائي كل 15 ثانية</div>
        <div class="timer-sub">البيانات محدّثة دايماً</div>
      </div>
      <div class="live-badge"><div class="live-dot"></div>LIVE</div>
    </div>

    <div class="sec-header">
      <div class="sec-title"><div class="sec-line"></div>الكروت المتاحة</div>
      <div class="sec-count" id="ccnt">—</div>
    </div>

    <div id="cardsWrap">
      <div class="empty-state">
        <i class="fas fa-spinner fa-spin empty-icon" style="color:var(--red)"></i>
        <div class="empty-title">جاري التحميل...</div>
      </div>
    </div>

  </div>
</div>

<!-- ── TOAST ── -->
<div class="toast" id="toastEl"></div>

<!-- ── NAV ── -->
<nav class="botnav">
  <a href="https://t.me/FY_TF" target="_blank" class="nav-item">
    <i class="fab fa-telegram-plane"></i><span>تيليجرام</span>
  </a>
  <a href="https://wa.me/message/U6AIKBGFCNCQK1" target="_blank" class="nav-item">
    <i class="fab fa-whatsapp"></i><span>واتساب</span>
  </a>
  <a href="https://www.facebook.com/VI808IV" target="_blank" class="nav-item">
    <i class="fab fa-facebook-f"></i><span>فيسبوك</span>
  </a>
</nav>

<script>
const _=id=>document.getElementById(id);
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

/* TOAST */
function showToast(msg,t=''){
  const el=_('toastEl');el.textContent=msg;el.className='toast show'+(t?' '+t:'');
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2800);
}

/* STATE */
let loggedIn=false,userNumber='',timerInt=null;

/* SHOW PAGE */
function show(pg){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  _(pg+'-page').classList.add('active');
}

/* SPLASH */
setTimeout(()=>{
  _('splash').classList.add('out');
  setTimeout(async()=>{
    _('splash').style.display='none';
    try{
      const r=await fetch('/check');const d=await r.json();
      if(d.logged){loggedIn=true;userNumber=d.number;_('topNum').textContent=d.number;show('app');startCycle();}
      else show('login');
    }catch{show('login')}
  },700);
},4000);

/* LOGIN */
async function doLogin(){
  const num=_('inpNum').value.trim(),pw=_('inpPw').value.trim();
  if(!num||!pw)return;
  const btn=_('loginBtn');
  btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>&nbsp; جاري التحقق...';
  _('errBox').style.display='none';
  try{
    const fd=new FormData();fd.append('number',num);fd.append('password',pw);
    const r=await fetch('/login',{method:'POST',body:fd});
    const d=await r.json();
    if(d.ok){
      loggedIn=true;userNumber=d.number;
      _('topNum').textContent=d.number;show('app');startCycle();
    }else{
      _('errMsg').textContent=d.error||'الرقم أو الباسورد غلط';
      _('errBox').style.display='flex';
    }
  }catch{
    _('errMsg').textContent='خطأ في الاتصال — تحقق من النت';
    _('errBox').style.display='flex';
  }
  btn.disabled=false;
  btn.innerHTML='<i class="fas fa-right-to-bracket"></i>&nbsp; دخول';
}

_('inpPw')?.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
_('inpNum')?.addEventListener('keydown',e=>{if(e.key==='Enter')_('inpPw').focus()});

/* LOGOUT */
_('logoutBtn').onclick=async()=>{
  await fetch('/logout');loggedIn=false;clearInterval(timerInt);show('login');
};

/* COPY */
function copySerial(btn){
  const s=btn.closest('.card-serial').querySelector('.serial-num').textContent.trim();
  const ok=()=>{
    const o=btn.innerHTML;
    btn.innerHTML='<i class="fas fa-check" style="color:var(--green)"></i>';
    setTimeout(()=>btn.innerHTML=o,1500);
    showToast('✅ تم نسخ الكود','ok');
  };
  if(navigator.clipboard)navigator.clipboard.writeText(s).then(ok).catch(fb);else fb();
  function fb(){const t=document.createElement('textarea');t.value=s;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch{}document.body.removeChild(t);ok()}
}

/* CHARGE */
async function chargeCard(serial,btn){
  btn.classList.add('loading');
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>&nbsp;<span>جاري...</span>';
  try{
    const r=await fetch('/redeem?serial='+encodeURIComponent(serial));
    const d=await r.json();
    if(d.ok){
      showToast('✅ تم الشحن بنجاح','ok');
      btn.classList.remove('loading');btn.classList.add('done');
      btn.innerHTML='<i class="fas fa-check"></i>&nbsp;<span>تم الشحن</span>';
    }else{
      showToast('❌ فشل الشحن — حاول مرة تانية','err');
      btn.classList.remove('loading');
      btn.innerHTML='<i class="fas fa-bolt"></i>&nbsp;<span>شحن أونلاين</span>';
    }
  }catch{
    showToast('❌ خطأ في الاتصال','err');
    btn.classList.remove('loading');
    btn.innerHTML='<i class="fas fa-bolt"></i>&nbsp;<span>شحن أونلاين</span>';
  }
}

/* RENDER */
function renderCards(list){
  const wrap=_('cardsWrap'),cnt=_('ccnt');
  const total=_('st-total'),maxEl=_('st-max'),remEl=_('st-rem');
  if(!list||!list.length){
    cnt.textContent='0';total.textContent='0';maxEl.textContent='—';remEl.textContent='—';
    wrap.innerHTML='<div class="empty-state"><i class="fas fa-inbox empty-icon"></i><div class="empty-title">لا توجد عروض متاحة الآن</div><div class="empty-sub">يتجدد البحث تلقائياً...</div></div>';
    return;
  }
  cnt.textContent=list.length+' كرت';
  total.textContent=list.length;
  maxEl.textContent=Math.max(...list.map(c=>c.amount))+' ج';
  remEl.textContent=list.reduce((a,c)=>a+c.remaining,0);

  wrap.innerHTML=list.map((p,i)=>{
    const ussd='*858*'+p.serial.replace(/\s/g,'')+'#';
    return`<div class="promo-card" style="--i:${i}">
      <div class="card-stripe"></div>
      <div class="card-main">
        <div class="card-details">
          <div class="card-chips">
            <span class="chip chip-red"><i class="fas fa-tag"></i>${esc(p.amount)} جنيه</span>
            <span class="chip chip-gold"><i class="fas fa-gift"></i>${esc(p.gift)} وحدة</span>
            <span class="chip chip-blue"><i class="fas fa-rotate"></i>${esc(p.remaining)} متبقي</span>
          </div>
        </div>
        <div class="card-amount">
          <div class="amount-num">${esc(p.amount)}</div>
          <div class="amount-cur">جنيه</div>
        </div>
      </div>
      <div class="card-serial">
        <span class="serial-num">${esc(p.serial)}</span>
        <button onclick="copySerial(this)" class="btn-copy"><i class="fas fa-clone"></i></button>
      </div>
      <div class="card-actions">
        <button class="btn-charge" onclick="chargeCard('${esc(p.serial)}',this)">
          <i class="fas fa-bolt"></i><span>شحن أونلاين</span>
        </button>
        <a href="tel:${encodeURIComponent(ussd)}" class="btn-dial">
          <i class="fas fa-phone"></i><span>شحن بالهاتف</span>
        </a>
      </div>
    </div>`;
  }).join('');
}

/* TIMER */
const CIRC=2*Math.PI*16;
function startTimer(cb){
  let t=15;
  const num=_('tnum'),prog=_('tprog');
  if(!num||!prog)return;
  prog.style.strokeDasharray=CIRC;prog.style.strokeDashoffset=0;
  clearInterval(timerInt);
  timerInt=setInterval(()=>{
    t--;num.textContent=Math.max(t,0);
    prog.style.strokeDashoffset=CIRC*(t/15);
    prog.style.stroke=t<=4?'#ff3333':'var(--red)';
    if(t<=0){clearInterval(timerInt);setTimeout(cb,200)}
  },1000);
}

async function getCards(){
  try{const r=await fetch('/fetch?t='+Date.now());const d=await r.json();if(d.ok)renderCards(d.promos)}catch{}
}
function startCycle(){getCards();startTimer(()=>startCycle())}
</script>
</body>
</html>"""

@app.route("/")
def index():
    return render_template_string(PAGE)

@app.route("/check")
def check():
    if session.get("logged_in"):
        return jsonify({"logged":True,"number":session.get("number","")})
    return jsonify({"logged":False})

@app.route("/login", methods=["POST"])
def login():
    number   = request.form.get("number","").strip()
    password = request.form.get("password","").strip()
    if not number or not password:
        return jsonify({"ok":False,"error":"الرجاء إدخال رقم الموبايل وكلمة المرور"})
    res = api_login(number, password)
    if "access_token" in res:
        session.clear()
        session["logged_in"]  = True
        session["token"]      = res["access_token"]
        session["token_exp"]  = time.time() + int(res.get("expires_in",3600)) - 120
        session["number"]     = number
        session["password"]   = password
        return jsonify({"ok":True,"number":number})
    return jsonify({"ok":False,"error":"الرقم أو الباسورد غلط — تحقق وحاول تاني"})

@app.route("/fetch")
def fetch():
    if not session.get("logged_in"):
        return jsonify({"ok":False})
    do_refresh()
    return jsonify({"ok":True,"promos":api_promos(session["token"],session["number"])})

@app.route("/redeem")
def redeem():
    if not session.get("logged_in"):
        return jsonify({"ok":False})
    do_refresh()
    serial = request.args.get("serial","").strip()
    code   = api_redeem(session["token"],session["number"],serial)
    return jsonify({"ok":code==200,"code":code})

@app.route("/logout")
def logout():
    session.clear()
    return jsonify({"ok":True})

if __name__ == "__main__":
    print("\n"+"═"*40)
    print("  TALASHNY  |  http://localhost:5000")
    print("═"*40+"\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
