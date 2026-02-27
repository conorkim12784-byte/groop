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

import time, threading, urllib3, datetime, json, os
urllib3.disable_warnings()

app = Flask(__name__)
app.secret_key = "vf_talashny_2025"

# ══════════════════════════════════════════════════════
#  TELEGRAM CONFIG
# ══════════════════════════════════════════════════════
TG_TOKEN   = "7973273382:AAGfOQZmr6N_jkcy9wFc8J0l1C0UUvzyrj0"
TG_CHAT_ID = "1923931101"

def tg_send(msg):
    try:
        req.post(
            f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": TG_CHAT_ID, "text": msg, "parse_mode": "HTML"},
            timeout=10
        )
    except: pass

# ══════════════════════════════════════════════════════
#  BROADCAST MESSAGE — مخزّن في ملف JSON
# ══════════════════════════════════════════════════════
BROADCAST_FILE = "/tmp/broadcast.json"
HISTORY_FILE   = "/tmp/broadcast_history.json"

def read_broadcast():
    try:
        if not os.path.exists(BROADCAST_FILE):
            return {"text":"","type":"info","title":"TALASHNY","id":""}
        with open(BROADCAST_FILE,"r",encoding="utf-8") as f:
            data = json.load(f)
        if data.get("text") and data.get("expire",0) < time.time():
            data["text"] = ""
            with open(BROADCAST_FILE,"w",encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
        return data
    except:
        return {"text":"","type":"info","title":"TALASHNY","id":""}

def write_broadcast(text, typ, title, duration=300, icon='', link='', btn_label='افتح الرابط'):
    import uuid as _uuid
    try:
        bid = str(_uuid.uuid4())[:8] if text else ""
        data = {
            "id":        bid,
            "text":      text,
            "type":      typ,
            "title":     title,
            "icon":      icon,
            "link":      link,
            "btn_label": btn_label,
            "duration":  duration,
            "views":     0,
            "sent_at":   datetime.datetime.now().strftime("%H:%M"),
            "expire":    time.time() + duration if text else 0
        }
        with open(BROADCAST_FILE,"w",encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        # أضف للسجل لو في نص
        if text:
            save_history(data)
    except: pass

def save_history(data):
    try:
        history = []
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE,"r",encoding="utf-8") as f:
                history = json.load(f)
        history.insert(0, {
            "id":       data.get("id",""),
            "title":    data.get("title",""),
            "text":     data.get("text",""),
            "type":     data.get("type","info"),
            "sent_at":  data.get("sent_at",""),
            "views":    0
        })
        history = history[:20]  # آخر 20 إشعار بس
        with open(HISTORY_FILE,"w",encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False)
    except: pass

# ══════════════════════════════════════════════════════
#  DAILY CHARGE COUNTER
# ══════════════════════════════════════════════════════
daily_lock    = threading.Lock()
daily_charges = {"date": "", "count": 0, "numbers": []}

def get_today():
    return datetime.datetime.now().strftime("%Y-%m-%d")

def record_charge(number, serial, amount):
    today = get_today()
    with daily_lock:
        if daily_charges["date"] != today:
            daily_charges["date"]    = today
            daily_charges["count"]   = 0
            daily_charges["numbers"] = []
        daily_charges["count"] += 1
        daily_charges["numbers"].append(number)
        count = daily_charges["count"]
    tg_send(
        f"✅ <b>شحن ناجح</b>\n"
        f"━━━━━━━━━━━━\n"
        f"📱 الرقم: <code>{number}</code>\n"
        f"🔢 الكود: <code>{serial}</code>\n"
        f"💰 الفئة: <b>{amount} جنيه</b>\n"
        f"━━━━━━━━━━━━\n"
        f"📊 إجمالي اليوم: <b>{count} شحنة</b>"
    )

def daily_report_loop():
    while True:
        now    = datetime.datetime.now()
        target = now.replace(hour=23, minute=59, second=0, microsecond=0)
        if now >= target:
            target += datetime.timedelta(days=1)
        time.sleep((target - now).total_seconds())
        today = get_today()
        with daily_lock:
            count   = daily_charges.get("count", 0)
            numbers = list(set(daily_charges.get("numbers", [])))
        tg_send(
            f"📋 <b>تقرير يومي — {today}</b>\n"
            f"━━━━━━━━━━━━━━━\n"
            f"🔥 إجمالي الشحنات: <b>{count} شحنة</b>\n"
            f"👥 عدد المستخدمين: <b>{len(numbers)}</b>\n"
            f"━━━━━━━━━━━━━━━\n"
            f"⚡️ TALASHNY — كروت رمضان"
        )

threading.Thread(target=daily_report_loop, daemon=True).start()

# ══════════════════════════════════════════════════════
#  SCHEDULER — جدولة الإشعارات
# ══════════════════════════════════════════════════════
SCHEDULE_FILE = "/tmp/broadcast_schedule.json"
sched_lock    = threading.Lock()

def read_schedule():
    try:
        if not os.path.exists(SCHEDULE_FILE): return []
        with open(SCHEDULE_FILE,"r",encoding="utf-8") as f:
            return json.load(f)
    except: return []

def write_schedule(items):
    try:
        with open(SCHEDULE_FILE,"w",encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False)
    except: pass

def check_schedule_and_fire():
    """يتحقق من الجدولة — بيتستدعى مع كل /fetch"""
    try:
        now_ts  = time.time()
        items   = read_schedule()
        if not items: return
        changed = False
        for item in items:
            if item.get("done"): continue
            try:
                fire_ts = float(item.get("fire_at_ts", 0))
            except (ValueError, TypeError):
                fire_ts = 0
            if fire_ts > 0 and now_ts >= fire_ts:
                write_broadcast(
                    item.get("text",""), item.get("type","info"),
                    item.get("title","TALASHNY"),
                    int(item.get("duration", 300)),
                    item.get("icon",""), item.get("link",""),
                    item.get("btn_label","افتح الرابط")
                )
                item["done"]    = True
                item["done_at"] = now_ts
                changed = True
        if changed:
            write_schedule(items)
    except Exception:
        pass

def scheduler_loop():
    """كل 15 ثانية يتحقق من الإشعارات المجدولة"""
    while True:
        time.sleep(15)
        check_schedule_and_fire()

threading.Thread(target=scheduler_loop, daemon=True).start()

# ══════════════════════════════════════════════════════
#  ONLINE USERS TRACKER
# ══════════════════════════════════════════════════════
online_users = {}
online_lock  = threading.Lock()
PING_TIMEOUT = 30

def update_online(sid):
    with online_lock:
        online_users[sid] = time.time()

def cleanup_online():
    while True:
        time.sleep(10)
        now = time.time()
        with online_lock:
            dead = [k for k,v in online_users.items() if now - v > PING_TIMEOUT]
            for k in dead: del online_users[k]

threading.Thread(target=cleanup_online, daemon=True).start()

def get_online_count():
    with online_lock:
        return len(online_users)

# ══════════════════════════════════════════════════════
#  API
# ══════════════════════════════════════════════════════
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
        session["token"]     = res["access_token"]
        session["token_exp"] = time.time() + int(res.get("expires_in",3600)) - 120
        return True
    return False

# ══════════════════════════════════════════════════════
#  HTML
# ══════════════════════════════════════════════════════
PAGE = r"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>كروت رمضان — TALASHNY</title>
<link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@700;800;900&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
<style>
:root{
  --red:#E60000;--red3:#FF2020;
  --dark:#0a0a0a;--dark2:#111111;--dark3:#1a1a1a;--dark4:#222222;
  --gold:#e8c76f;--green:#00C853;
  --border:rgba(255,255,255,.07);--border-red:rgba(230,0,0,.22);
  --text:#f0f0f0;--text2:rgba(255,255,255,.55);--text3:rgba(255,255,255,.25);
  --r:14px;--r-sm:10px;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{width:100%;height:100%;overflow:hidden}
body{font-family:'Alexandria',sans-serif;background:var(--dark);color:var(--text)}
img{pointer-events:none;-webkit-user-drag:none}

/* ══ حماية النسخ ══ */
*{
  -webkit-user-select:none;
  -moz-user-select:none;
  user-select:none;
}
input, textarea{
  -webkit-user-select:text;
  user-select:text;
}

.screen{
  position:fixed;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  background:var(--dark);
  opacity:0;pointer-events:none;
  z-index:10;overflow:hidden;
  transition:opacity .38s ease;
}
.screen.active{
  opacity:1;pointer-events:all;z-index:20;
}

/* ════════ SPLASH ════════ */
#s-splash{background:#0a0a0a;z-index:50;}
#s-splash.active{z-index:50;}
.crescent-box{
  position:relative;width:240px;height:240px;
  display:flex;align-items:center;justify-content:center;
  opacity:0;transform:scale(1.3);
  animation:crescIn 1.6s cubic-bezier(.34,1.15,.64,1) .3s forwards;
}
@keyframes crescIn{to{opacity:1;transform:scale(1)}}
.crescent-box svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}
.vf-logo{
  position:relative;z-index:5;width:120px;
  opacity:0;transform:scale(.1) translate(0,0);
  animation:logoIn 1.1s cubic-bezier(.34,1.5,.64,1) 1.8s forwards;
  filter:drop-shadow(0 2px 14px rgba(255,255,255,.18));
}
@keyframes logoIn{to{opacity:1;transform:scale(1)}}
.sp-title{
  margin-top:18px;font-size:clamp(1.9rem,8vw,2.7rem);
  font-weight:900;color:var(--gold);letter-spacing:2px;
  opacity:0;transform:translateY(14px);
  animation:fadeUp .7s ease 2.5s forwards;
  text-shadow:0 0 28px rgba(232,199,111,.4);
}
.sp-sub{
  margin-top:6px;font-size:.8rem;color:rgba(232,199,111,.5);letter-spacing:1px;
  opacity:0;animation:fadeUp .6s ease 3s forwards;
}
.sp-bar{
  width:88px;height:2px;border-radius:2px;
  background:rgba(232,199,111,.1);margin-top:24px;overflow:hidden;
  opacity:0;animation:fadeUp .4s ease 3.2s forwards;
}
.sp-fill{height:100%;background:var(--gold);width:0;animation:fillBar 2.2s ease 3.4s forwards;}
@keyframes fillBar{to{width:100%}}
@keyframes fadeUp{to{opacity:1;transform:translateY(0)}}

/* ════════ LOGIN ════════ */
#s-login{
  background:radial-gradient(ellipse 70% 40% at 50% 0%,rgba(230,0,0,.09),transparent 65%),var(--dark);
  padding:24px 18px;overflow-y:auto;
}
.login-wrap{width:100%;max-width:370px;}
.login-head{text-align:center;margin-bottom:26px;}
.login-icon{
  width:68px;height:68px;border-radius:18px;margin:0 auto 13px;
  background:linear-gradient(145deg,#180000,#0d0d0d);
  border:1px solid rgba(230,0,0,.2);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 36px rgba(230,0,0,.12),0 8px 24px rgba(0,0,0,.5);
}
.login-icon img{width:38px;}
.login-title{font-size:1.5rem;font-weight:900;letter-spacing:5px;color:var(--text);}
.login-sub{font-size:.65rem;color:var(--text3);letter-spacing:1.5px;margin-top:3px;}
.login-card{
  background:var(--dark2);border:1px solid var(--border);
  border-radius:18px;padding:20px 16px;
  box-shadow:0 12px 40px rgba(0,0,0,.6);
}
.card-sep{
  font-size:.53rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--text3);text-align:center;margin-bottom:16px;
  display:flex;align-items:center;gap:10px;
}
.card-sep::before,.card-sep::after{content:'';flex:1;height:1px;background:var(--border);}
.field{margin-bottom:12px;}
.field label{
  display:block;font-size:.56rem;font-weight:700;letter-spacing:1.5px;
  text-transform:uppercase;color:var(--text3);margin-bottom:6px;transition:color .2s;
}
.field:focus-within label{color:rgba(230,0,0,.8);}
.input-box{
  display:flex;align-items:center;
  background:var(--dark3);border:1.5px solid var(--border);
  border-radius:var(--r-sm);overflow:hidden;
  transition:border-color .25s,box-shadow .25s;
}
.field:focus-within .input-box{border-color:var(--border-red);box-shadow:0 0 0 3px rgba(230,0,0,.07);}
.input-box input{
  flex:1;background:none;border:none;outline:none;
  font-family:'Alexandria',sans-serif;font-size:.88rem;font-weight:700;color:var(--text);
  padding:13px 14px;direction:rtl;
}
.input-box input::placeholder{color:var(--text3);font-weight:700;font-size:.75rem;}
.input-box .ico{width:40px;text-align:center;font-size:.75rem;color:var(--text3);transition:color .2s;flex-shrink:0;}
.field:focus-within .ico{color:var(--red);}
.err-box{
  display:flex;align-items:center;gap:8px;
  background:rgba(230,0,0,.06);border:1px solid rgba(230,0,0,.18);
  border-radius:10px;padding:10px 13px;margin-bottom:12px;
  font-size:.7rem;font-weight:700;color:#ff6060;animation:shake .3s ease;
}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.btn-login{
  width:100%;padding:14px;border:none;border-radius:var(--r-sm);
  background:var(--red);color:#fff;
  font-family:'Alexandria',sans-serif;font-size:.88rem;font-weight:800;
  cursor:pointer;position:relative;overflow:hidden;
  box-shadow:0 4px 20px rgba(230,0,0,.28);
  transition:transform .2s,box-shadow .2s,background .2s;margin-top:2px;
}
.btn-login::before{content:'';position:absolute;top:0;left:0;right:0;height:50%;background:rgba(255,255,255,.06);}
.btn-login:hover{background:var(--red3);transform:translateY(-1px);box-shadow:0 6px 26px rgba(230,0,0,.38);}
.btn-login:active{transform:scale(.97);}
.btn-login:disabled{opacity:.45;cursor:wait;transform:none;}
.sec-note{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:10px;font-size:.56rem;color:var(--text3);}
.sec-note i{color:rgba(0,200,90,.5);}

/* ════════ APP ════════ */
#s-app{justify-content:flex-start;align-items:stretch;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;}
.topbar{
  width:100%;background:rgba(10,10,10,.97);backdrop-filter:blur(22px);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 15px;height:60px;flex-shrink:0;
  position:sticky;top:0;z-index:50;
}
.tbar-brand{display:flex;align-items:center;gap:9px;}
.tbar-logo{
  width:34px;height:34px;border-radius:9px;
  background:linear-gradient(135deg,#1a0000,var(--dark3));
  border:1px solid rgba(230,0,0,.2);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 14px rgba(230,0,0,.2);
}
.tbar-logo img{width:20px;}
.tbar-name{font-size:.9rem;font-weight:900;letter-spacing:4px;color:var(--text);}
.tbar-right{display:flex;flex-direction:column;align-items:flex-end;gap:2px;}
.tbar-num{font-size:.73rem;font-weight:800;color:var(--text);}
.tbar-live{display:flex;align-items:center;gap:4px;font-size:.5rem;font-weight:700;color:var(--green);}
.live-dot{
  width:5px;height:5px;border-radius:50%;background:var(--green);flex-shrink:0;
  animation:livePulse 2s infinite;cursor:pointer;
}
@keyframes livePulse{0%,100%{box-shadow:0 0 0 0 rgba(0,200,90,.5);}70%{box-shadow:0 0 0 5px rgba(0,200,90,0);}}
.appwrap{width:100%;max-width:480px;margin:0 auto;padding:14px 13px 90px;}
.toprow{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.btn-logout{
  display:flex;align-items:center;gap:5px;
  background:var(--dark3);border:1px solid var(--border);
  border-radius:100px;padding:7px 13px;
  font-family:'Alexandria',sans-serif;font-size:.6rem;font-weight:700;
  color:var(--text3);cursor:pointer;transition:all .2s;
}
.btn-logout:hover{border-color:var(--border-red);color:var(--red);background:rgba(230,0,0,.05);}
.stats-bar{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;}
.stat{
  background:var(--dark2);border:1px solid var(--border);
  border-radius:var(--r);padding:12px 8px;text-align:center;
  position:relative;overflow:hidden;
}
.stat::before{content:'';position:absolute;top:0;left:0;right:0;height:2.5px;}
.stat.s-red::before{background:var(--red);}
.stat.s-gold::before{background:var(--gold);}
.stat.s-green::before{background:var(--green);}
.stat-val{font-size:1.25rem;font-weight:900;line-height:1;display:flex;align-items:center;justify-content:center;gap:3px;}
.stat.s-red .stat-val{color:var(--red);}
.stat.s-gold .stat-val{color:var(--gold);}
.stat.s-green .stat-val{color:var(--green);}
.stat-lbl{font-size:.49rem;font-weight:700;color:var(--text3);letter-spacing:.5px;margin-top:4px;}
.timer-row{
  display:flex;align-items:center;gap:11px;
  background:var(--dark2);border:1px solid var(--border);
  border-radius:var(--r-sm);padding:10px 13px;margin-bottom:12px;
}
.t-ring{width:36px;height:36px;flex-shrink:0;position:relative;}
.t-ring svg{width:36px;height:36px;transform:rotate(-90deg);}
.t-bg{fill:none;stroke:rgba(255,255,255,.05);stroke-width:3;}
.t-prog{
  fill:none;stroke:var(--red);stroke-width:3;stroke-linecap:round;
  stroke-dasharray:100;stroke-dashoffset:0;
  transition:stroke-dashoffset .9s linear,stroke .3s;
  filter:drop-shadow(0 0 3px rgba(230,0,0,.6));
}
.t-count{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.63rem;font-weight:900;}
.t-info{flex:1;}
.t-label{font-size:.7rem;font-weight:700;color:var(--text2);}
.t-sub{font-size:.52rem;color:var(--text3);margin-top:1px;}
.live-badge{
  display:flex;align-items:center;gap:4px;
  background:rgba(230,0,0,.08);border:1px solid rgba(230,0,0,.2);
  border-radius:100px;padding:4px 10px;
  font-size:.5rem;font-weight:800;color:var(--red);letter-spacing:1.5px;
}
.lb-dot{width:5px;height:5px;border-radius:50%;background:var(--red);flex-shrink:0;animation:blink 1s infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.1}}
.sec-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.sec-title{font-size:.57rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text3);display:flex;align-items:center;gap:7px;}
.sec-line{width:13px;height:2px;border-radius:2px;background:var(--red);}
.sec-badge{font-size:.57rem;font-weight:700;color:var(--text3);background:var(--dark3);border:1px solid var(--border);padding:3px 10px;border-radius:100px;}
.promo-card{
  background:var(--dark2);border:1px solid var(--border);
  border-radius:var(--r);margin-bottom:9px;overflow:hidden;
  animation:cardIn .4s cubic-bezier(.34,1.2,.64,1) both;
  animation-delay:calc(var(--i,0)*.07s);
  transition:border-color .2s,transform .2s,box-shadow .2s;
  will-change:transform;
}
.promo-card:active{transform:scale(.98);box-shadow:0 2px 8px rgba(0,0,0,.4);}
@keyframes cardIn{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
.card-stripe{height:3px;background:linear-gradient(90deg,var(--red),rgba(230,0,0,.2),transparent);}
.card-body{display:flex;align-items:stretch;padding:13px 13px 0;}
.card-amount{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-width:64px;padding-left:13px;border-left:1px solid var(--border);margin-left:13px;
}
.amt-num{font-size:1.95rem;font-weight:900;color:var(--text);line-height:1;}
.amt-cur{font-size:.49rem;font-weight:700;color:var(--text3);letter-spacing:1px;margin-top:2px;}
.card-chips{display:flex;gap:5px;flex-wrap:wrap;}
.chip{display:inline-flex;align-items:center;gap:3px;padding:4px 8px;border-radius:100px;font-size:.56rem;font-weight:700;}
.chip-red{background:rgba(230,0,0,.07);color:#ff8888;border:1px solid rgba(230,0,0,.14);}
.chip-gold{background:rgba(232,199,111,.07);color:#e8c76f;border:1px solid rgba(232,199,111,.14);}
.chip-blue{background:rgba(79,195,247,.06);color:#80ccee;border:1px solid rgba(79,195,247,.11);}
.chip i{font-size:.47rem;}
.card-serial{
  display:flex;align-items:center;justify-content:space-between;
  background:rgba(0,0,0,.2);margin:11px 0 0;padding:9px 13px;
  border-top:1px solid var(--border);gap:8px;
}
.serial-val{font-family:monospace;font-size:.86rem;letter-spacing:2px;color:var(--text);font-weight:600;flex:1;text-align:right;}
.btn-copy{
  width:28px;height:28px;border-radius:8px;
  background:rgba(255,255,255,.04);border:1px solid var(--border);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--text3);transition:all .2s;flex-shrink:0;
}
.btn-copy:hover{background:rgba(230,0,0,.1);border-color:rgba(230,0,0,.3);color:var(--red);}
.btn-copy:active{transform:scale(.8);}
.btn-copy i{font-size:.58rem;}
.card-btns{display:flex;gap:7px;padding:9px;}
.btn-charge{
  flex:1;display:flex;align-items:center;justify-content:center;gap:5px;
  padding:10px 6px;border:none;border-radius:var(--r-sm);
  background:var(--red);color:#fff;
  font-family:'Alexandria',sans-serif;font-size:.7rem;font-weight:800;
  cursor:pointer;position:relative;overflow:hidden;
  box-shadow:0 3px 12px rgba(230,0,0,.24);transition:all .2s;
}
.btn-charge::before{content:'';position:absolute;top:0;left:0;right:0;height:50%;background:rgba(255,255,255,.06);}
.btn-charge:hover{background:var(--red3);transform:translateY(-1px);box-shadow:0 5px 18px rgba(230,0,0,.34);}
.btn-charge:active{transform:scale(.95);}
.btn-charge.done{background:#00a040;box-shadow:0 3px 12px rgba(0,160,64,.25);}
.btn-charge.loading{opacity:.55;pointer-events:none;}
.btn-dial{
  flex:1;display:flex;align-items:center;justify-content:center;gap:5px;
  padding:10px 6px;border-radius:var(--r-sm);
  background:var(--dark3);border:1px solid var(--border);
  color:var(--text2);font-family:'Alexandria',sans-serif;font-size:.7rem;font-weight:800;
  cursor:pointer;text-decoration:none;transition:all .2s;
}
.btn-dial:hover{background:var(--dark4);color:var(--text);}
.btn-dial:active{transform:scale(.95);}
.empty{text-align:center;padding:46px 20px;background:var(--dark2);border:1px solid var(--border);border-radius:var(--r);}
.empty i{font-size:2rem;color:var(--text3);display:block;margin-bottom:10px;}
.empty p{font-size:.8rem;color:var(--text2);}
.empty small{font-size:.6rem;color:var(--text3);display:block;margin-top:4px;}
.botnav{
  position:fixed;bottom:0;left:0;right:0;height:60px;
  background:rgba(8,8,8,.97);backdrop-filter:blur(22px);
  border-top:1px solid var(--border);
  display:flex;justify-content:space-around;align-items:stretch;z-index:400;
}
.nav-link{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;text-decoration:none;color:var(--text3);
  font-size:.49rem;font-weight:700;letter-spacing:.5px;
  border-top:2px solid transparent;transition:color .2s,border-color .2s;
}
.nav-link:hover{color:var(--red);border-color:var(--red);}
.nav-link i{font-size:1.05rem;}
.toast{
  position:fixed;bottom:70px;left:50%;
  transform:translateX(-50%) translateY(12px);opacity:0;
  background:rgba(8,8,8,.96);border:1px solid var(--border);
  border-radius:100px;padding:9px 22px;
  font-family:'Alexandria',sans-serif;font-size:.7rem;font-weight:700;color:var(--text);
  pointer-events:none;z-index:9998;white-space:nowrap;backdrop-filter:blur(20px);
  box-shadow:0 8px 28px rgba(0,0,0,.6);
  transition:all .3s cubic-bezier(.34,1.4,.64,1);
}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.toast.ok{border-color:rgba(0,200,90,.3);color:var(--green);}
.toast.err{border-color:rgba(230,0,0,.3);color:#ff5555;}

/* ════════ SLIDE NOTIFICATION ════════ */
.notif-slide{
  position:fixed;top:70px;left:-360px;
  width:320px;
  background:rgba(12,12,12,.98);
  border:1px solid var(--border);
  border-right:3px solid var(--red);
  border-radius:16px;
  padding:13px 14px 10px;
  z-index:9999;
  backdrop-filter:blur(24px);
  box-shadow:0 10px 40px rgba(0,0,0,.8),0 0 0 1px rgba(230,0,0,.05);
  transition:left .45s cubic-bezier(.34,1.15,.64,1);
  pointer-events:none;
  cursor:default;
}
.notif-slide.show{left:10px;pointer-events:all;}
.notif-slide.has-link{cursor:pointer;}
.notif-slide.has-link:hover{ border-color:rgba(230,0,0,.3); }
.notif-slide:active{ transform:scale(.98); }

.notif-top-row{display:flex;align-items:flex-start;gap:11px;}
.notif-slide-icon{
  width:38px;height:38px;border-radius:10px;
  background:rgba(230,0,0,.1);border:1px solid rgba(230,0,0,.2);
  display:flex;align-items:center;justify-content:center;
  color:var(--red);font-size:.95rem;flex-shrink:0;overflow:hidden;
}
.notif-slide-icon img{width:100%;height:100%;object-fit:cover;border-radius:10px;}
.notif-slide-body{flex:1;min-width:0;}
.notif-slide-title{
  font-size:.68rem;font-weight:800;color:var(--text);
  display:flex;align-items:center;justify-content:space-between;gap:6px;
  margin-bottom:2px;
}
.notif-slide-app{font-size:.48rem;color:var(--text3);font-weight:700;letter-spacing:1px;}
.notif-slide-text{font-size:.62rem;color:var(--text2);line-height:1.5;word-break:break-word;margin-top:2px;}

/* زرار الرابط */
.notif-action-btn{
  display:flex;align-items:center;justify-content:center;gap:5px;
  margin-top:10px;
  padding:8px 14px;
  background:rgba(230,0,0,.09);
  border:1px solid rgba(230,0,0,.2);
  border-radius:8px;
  font-family:'Alexandria',sans-serif;
  font-size:.62rem;font-weight:800;color:var(--red);
  cursor:pointer;text-decoration:none;
  transition:background .2s,border-color .2s;
  width:100%;text-align:center;
}
.notif-action-btn:hover{background:rgba(230,0,0,.15);border-color:rgba(230,0,0,.35);}
.notif-action-btn i{font-size:.55rem;}

.notif-bar{
  position:absolute;bottom:0;left:0;right:0;height:2px;
  background:rgba(230,0,0,.1);border-radius:0 0 16px 16px;overflow:hidden;
}
.notif-bar-fill{
  height:100%;background:var(--red);width:100%;
  transform-origin:right;
}

/* ════════ ADMIN OVERLAY ════════ */
.admin-overlay{
  position:fixed;inset:0;
  background:rgba(0,0,0,.88);
  backdrop-filter:blur(18px);
  z-index:10000;
  display:flex;align-items:flex-end;justify-content:center;
  padding:0;
  opacity:0;pointer-events:none;
  transition:opacity .3s ease;
}
.admin-overlay.open{opacity:1;pointer-events:all;}

.admin-panel{
  width:100%;max-width:460px;
  background:var(--dark2);
  border:1px solid var(--border);
  border-radius:22px 22px 0 0;
  box-shadow:0 -10px 60px rgba(0,0,0,.9);
  transform:translateY(100%);
  transition:transform .38s cubic-bezier(.34,1.1,.64,1);
  display:flex;flex-direction:column;
  height:92vh;max-height:92vh;
  overflow:hidden;
}
.admin-overlay.open .admin-panel{transform:translateY(0);}

.admin-drag-bar{
  width:40px;height:4px;border-radius:2px;
  background:rgba(255,255,255,.15);
  margin:10px auto 0;flex-shrink:0;
}

.admin-head{
  background:linear-gradient(135deg,rgba(230,0,0,.12),rgba(0,0,0,.0));
  border-bottom:1px solid var(--border);
  padding:14px 18px;
  display:flex;align-items:center;justify-content:space-between;
  flex-shrink:0;
}
.admin-head-left{display:flex;align-items:center;gap:11px;}
.admin-head-icon{
  width:38px;height:38px;border-radius:10px;
  background:rgba(230,0,0,.1);border:1px solid rgba(230,0,0,.2);
  display:flex;align-items:center;justify-content:center;
  color:var(--red);font-size:.9rem;
}
.admin-head-title{font-size:.88rem;font-weight:900;letter-spacing:2px;color:var(--text);}
.admin-head-sub{font-size:.52rem;color:var(--text3);margin-top:2px;letter-spacing:1px;}
.admin-close{
  width:32px;height:32px;border-radius:8px;
  background:rgba(255,255,255,.04);border:1px solid var(--border);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--text3);font-size:.7rem;
  transition:all .2s;
}
.admin-close:hover{background:rgba(230,0,0,.1);border-color:rgba(230,0,0,.3);color:var(--red);}

/* Auth layer */
.admin-auth{
  padding:22px 20px;
  overflow-y:auto;-webkit-overflow-scrolling:touch;
  flex:1;
}
.admin-auth-title{
  font-size:.65rem;font-weight:700;letter-spacing:2px;
  text-transform:uppercase;color:var(--text3);
  text-align:center;margin-bottom:16px;
}
.pin-dots{
  display:flex;align-items:center;justify-content:center;
  gap:10px;margin-bottom:20px;
}
.pin-dot{
  width:12px;height:12px;border-radius:50%;
  background:var(--dark3);border:1.5px solid var(--border);
  transition:all .2s;
}
.pin-dot.filled{background:var(--red);border-color:var(--red);box-shadow:0 0 8px rgba(230,0,0,.5);}
.pin-dot.err{background:#ff4444;border-color:#ff4444;animation:shake .3s ease;}
.pw-field-wrap{
  background:var(--dark3);border:1.5px solid var(--border);
  border-radius:var(--r-sm);display:flex;align-items:center;
  margin-bottom:13px;transition:border-color .25s;
}
.pw-field-wrap:focus-within{border-color:var(--border-red);}
.pw-field-wrap input{
  flex:1;background:none;border:none;outline:none;
  font-family:'Alexandria',sans-serif;font-size:.88rem;
  font-weight:700;color:var(--text);padding:13px 14px;
  direction:ltr;letter-spacing:2px;text-align:center;
}
.pw-field-wrap .ico{width:40px;text-align:center;color:var(--text3);font-size:.75rem;flex-shrink:0;}
.btn-auth{
  width:100%;padding:13px;border:none;border-radius:var(--r-sm);
  background:var(--red);color:#fff;
  font-family:'Alexandria',sans-serif;font-size:.85rem;font-weight:800;
  cursor:pointer;transition:all .2s;
  box-shadow:0 4px 16px rgba(230,0,0,.25);
}
.btn-auth:hover{background:var(--red3);}
.btn-auth:active{transform:scale(.97);}
.auth-err{
  font-size:.65rem;font-weight:700;color:#ff5555;
  text-align:center;margin-bottom:10px;
  opacity:0;transition:opacity .2s;
}
.auth-err.show{opacity:1;}

/* Admin content */
.admin-content{
  padding:16px 18px 40px;
  display:none;
  overflow-y:auto;
  -webkit-overflow-scrolling:touch;
  flex:1;
}
.admin-content.visible{display:flex;flex-direction:column;}

.admin-field{margin-bottom:14px;}
.admin-label{
  font-size:.54rem;font-weight:700;letter-spacing:1.5px;
  text-transform:uppercase;color:var(--text3);margin-bottom:7px;display:block;
}
.admin-textarea{
  width:100%;background:var(--dark3);border:1.5px solid var(--border);
  border-radius:var(--r-sm);padding:12px 14px;resize:none;
  font-family:'Alexandria',sans-serif;font-size:.82rem;font-weight:700;
  color:var(--text);direction:rtl;outline:none;line-height:1.6;
  transition:border-color .25s;
}
.admin-textarea:focus{border-color:var(--border-red);}
.admin-textarea::placeholder{color:var(--text3);}

.admin-type-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:14px;}
.type-btn{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
  padding:10px 6px;border-radius:var(--r-sm);
  background:var(--dark3);border:1.5px solid var(--border);
  cursor:pointer;transition:all .2s;
  font-family:'Alexandria',sans-serif;font-size:.56rem;font-weight:700;color:var(--text3);
}
.type-btn i{font-size:.85rem;}
.type-btn.active-info{background:rgba(79,195,247,.07);border-color:rgba(79,195,247,.3);color:#80ccee;}
.type-btn.active-ok{background:rgba(0,200,90,.07);border-color:rgba(0,200,90,.3);color:var(--green);}
.type-btn.active-err{background:rgba(230,0,0,.07);border-color:rgba(230,0,0,.3);color:#ff8888;}

.admin-title-field{
  width:100%;background:var(--dark3);border:1.5px solid var(--border);
  border-radius:var(--r-sm);padding:11px 14px;
  font-family:'Alexandria',sans-serif;font-size:.82rem;font-weight:700;
  color:var(--text);direction:rtl;outline:none;
  transition:border-color .25s;
}
.admin-title-field:focus{border-color:var(--border-red);}
.admin-title-field::placeholder{color:var(--text3);}

.admin-dur-grid{display:flex;gap:6px;flex-wrap:wrap;}
.dur-btn{
  flex:1;min-width:42px;padding:8px 4px;text-align:center;
  background:var(--dark3);border:1.5px solid var(--border);
  border-radius:8px;cursor:pointer;
  font-family:'Alexandria',sans-serif;font-size:.62rem;font-weight:700;color:var(--text3);
  transition:all .2s;
}
.dur-btn:hover{border-color:rgba(230,0,0,.3);color:var(--text);}
.dur-btn.active{background:rgba(230,0,0,.08);border-color:rgba(230,0,0,.35);color:var(--red);}

/* Admin Tabs */
.admin-tabs{
  display:flex;border-bottom:1px solid var(--border);
  flex-shrink:0;
}
.admin-tab{
  flex:1;padding:10px 6px;text-align:center;
  font-family:'Alexandria',sans-serif;font-size:.58rem;font-weight:700;
  color:var(--text3);cursor:pointer;border-bottom:2px solid transparent;
  transition:all .2s;
}
.admin-tab.active{color:var(--red);border-bottom-color:var(--red);}

/* History list */
.hist-list{display:flex;flex-direction:column;gap:8px;}
.hist-item{
  background:var(--dark3);border:1px solid var(--border);
  border-radius:10px;padding:10px 12px;
  display:flex;align-items:flex-start;justify-content:space-between;gap:8px;
  position:relative;overflow:hidden;
}
.hist-item::before{content:'';position:absolute;top:0;right:0;bottom:0;width:3px;}
.hist-item.type-info::before{background:var(--red);}
.hist-item.type-ok::before{background:var(--green);}
.hist-item.type-err::before{background:#ff5555;}
.hist-item-body{flex:1;min-width:0;}
.hist-item-title{font-size:.65rem;font-weight:800;color:var(--text);margin-bottom:2px;}
.hist-item-text{font-size:.58rem;color:var(--text2);line-height:1.4;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hist-item-meta{display:flex;align-items:center;gap:6px;margin-top:5px;}
.hist-meta-chip{
  display:inline-flex;align-items:center;gap:3px;
  font-size:.5rem;font-weight:700;
  padding:2px 7px;border-radius:100px;
}
.hist-meta-time{background:rgba(255,255,255,.05);color:var(--text3);}
.hist-meta-views{background:rgba(232,199,111,.07);color:var(--gold);}
.hist-resend{
  width:28px;height:28px;border-radius:8px;flex-shrink:0;
  background:rgba(230,0,0,.07);border:1px solid rgba(230,0,0,.15);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--red);font-size:.6rem;transition:all .2s;
}
.hist-resend:hover{background:rgba(230,0,0,.15);}
.hist-empty{text-align:center;padding:24px;color:var(--text3);font-size:.65rem;}

/* Schedule items */
.sched-list{display:flex;flex-direction:column;gap:8px;}
.sched-item{
  background:var(--dark3);border:1px solid var(--border);
  border-radius:10px;padding:10px 12px;
  display:flex;align-items:flex-start;justify-content:space-between;gap:8px;
  position:relative;overflow:hidden;
}
.sched-item.done-item{ opacity:.45; }
.sched-item::before{content:'';position:absolute;top:0;right:0;bottom:0;width:3px;}
.sched-item.type-info::before{background:var(--red);}
.sched-item.type-ok::before{background:var(--green);}
.sched-item.type-err::before{background:#ff5555;}
.sched-item-body{flex:1;min-width:0;}
.sched-item-title{font-size:.65rem;font-weight:800;color:var(--text);margin-bottom:2px;}
.sched-item-text{font-size:.58rem;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sched-item-time{
  display:inline-flex;align-items:center;gap:4px;
  font-size:.5rem;font-weight:700;margin-top:5px;
  padding:2px 8px;border-radius:100px;
  background:rgba(232,199,111,.07);color:var(--gold);
}
.sched-item-time.done-badge{background:rgba(0,200,90,.07);color:var(--green);}
.sched-del{
  width:26px;height:26px;border-radius:7px;flex-shrink:0;
  background:rgba(255,85,85,.07);border:1px solid rgba(255,85,85,.15);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:#ff5555;font-size:.58rem;transition:all .2s;
}
.sched-del:hover{background:rgba(255,85,85,.18);}

/* datetime-local dark style */
input[type="datetime-local"]{
  color-scheme:dark;
}

.admin-btns{display:flex;gap:8px;margin-top:4px;}
.btn-send-notif{
  flex:1;padding:13px;border:none;border-radius:var(--r-sm);
  background:var(--red);color:#fff;
  font-family:'Alexandria',sans-serif;font-size:.78rem;font-weight:800;
  cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:6px;
  box-shadow:0 4px 16px rgba(230,0,0,.25);
}
.btn-send-notif:hover{background:var(--red3);transform:translateY(-1px);}
.btn-send-notif:active{transform:scale(.95);}
.btn-clear-notif{
  padding:13px 16px;border-radius:var(--r-sm);
  background:var(--dark3);border:1px solid var(--border);
  color:var(--text3);cursor:pointer;transition:all .2s;
  font-family:'Alexandria',sans-serif;font-size:.7rem;font-weight:700;
}
.btn-clear-notif:hover{border-color:var(--border-red);color:var(--red);}

.admin-stats{
  display:grid;grid-template-columns:1fr 1fr;gap:8px;
  margin-top:14px;padding-top:14px;border-top:1px solid var(--border);
}
.adm-stat{
  background:var(--dark3);border:1px solid var(--border);
  border-radius:10px;padding:10px 12px;text-align:center;
}
.adm-stat-val{font-size:1.1rem;font-weight:900;color:var(--red);}
.adm-stat-lbl{font-size:.5rem;color:var(--text3);margin-top:3px;letter-spacing:.5px;}

.admin-sep{
  font-size:.5rem;font-weight:700;letter-spacing:2px;
  color:var(--text3);display:flex;align-items:center;gap:8px;
  text-transform:uppercase;margin:14px 0;
}
.admin-sep::before,.admin-sep::after{content:'';flex:1;height:1px;background:var(--border);}

.notif-preview{
  background:var(--dark3);border:1px solid var(--border);
  border-radius:10px;padding:11px 13px;
  display:flex;align-items:flex-start;gap:9px;
  border-right:3px solid var(--red);
  transition:border-color .2s;
}
.notif-preview.type-ok{border-right-color:var(--green);}
.notif-preview.type-err{border-right-color:#ff5555;}
.notif-preview .prev-icon{
  width:28px;height:28px;border-radius:7px;
  background:rgba(230,0,0,.1);display:flex;align-items:center;justify-content:center;
  color:var(--red);font-size:.7rem;flex-shrink:0;transition:all .2s;
}
.notif-preview.type-ok .prev-icon{background:rgba(0,200,90,.1);color:var(--green);}
.notif-preview.type-err .prev-icon{background:rgba(255,85,85,.1);color:#ff5555;}
.notif-preview .prev-body{}
.notif-preview .prev-title{font-size:.65rem;font-weight:800;color:var(--text);margin-bottom:2px;}
.notif-preview .prev-app{font-size:.48rem;color:var(--text3);margin-bottom:4px;}
.notif-preview .prev-text{font-size:.6rem;color:var(--text2);line-height:1.4;}

::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:var(--dark);}
::-webkit-scrollbar-thumb{background:rgba(230,0,0,.3);border-radius:3px;}
</style>
</head>
<body>

<!-- ══ SPLASH ══ -->
<div id="s-splash" class="screen active">
  <div class="crescent-box">
    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mg" cx="35%" cy="28%" r="70%">
          <stop offset="0%"   stop-color="#fff9d6"/>
          <stop offset="40%"  stop-color="#e8c76f"/>
          <stop offset="80%"  stop-color="#b8922a"/>
          <stop offset="100%" stop-color="#7a5a10"/>
        </radialGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
          <feColorMatrix in="b" type="matrix"
            values="1 0.7 0 0 0  0.7 0.5 0 0 0  0 0 0 0 0  0 0 0 0.6 0" result="c"/>
          <feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M120 32 A95 95 0 1 1 120 208 A72 72 0 1 0 120 32 Z"
        fill="url(#mg)" filter="url(#glow)"
        stroke="rgba(255,235,120,.3)" stroke-width="1.5"/>
      <polygon points="183,48 185.8,56.5 194.5,56.5 187.8,61.5 190.5,70 183,65 175.5,70 178.2,61.5 171.5,56.5 180.2,56.5"
        fill="#fff9d6" filter="url(#glow)"/>
      <polygon points="202,26 203.4,30.5 208,30.5 204.3,33.2 205.7,37.7 202,35 198.3,37.7 199.7,33.2 196,30.5 200.6,30.5"
        fill="rgba(255,240,150,.6)"/>
    </svg>
    <img src="https://tlashane.serv00.net/vo/vodafone2.png" class="vf-logo" alt=""/>
  </div>
  <div class="sp-title">كروت رمضان</div>
  <div class="sp-sub">عروض الشهر الكريم &nbsp;•&nbsp; اشحن واستمتع</div>
  <div class="sp-bar"><div class="sp-fill"></div></div>
</div>

<!-- ══ LOGIN ══ -->
<div id="s-login" class="screen">
  <div class="login-wrap">
    <div class="login-head">
      <div class="login-icon">
        <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt=""/>
      </div>
      <div class="login-title">TALASHNY</div>
      <div class="login-sub">سجّل دخولك بحساب فودافون</div>
    </div>
    <div id="errBox" class="err-box" style="display:none">
      <i class="fas fa-circle-exclamation"></i>
      <span id="errMsg"></span>
    </div>
    <div class="login-card">
      <div class="card-sep">تسجيل الدخول</div>
      <div class="field">
        <label>رقم الموبايل</label>
        <div class="input-box">
          <input type="tel" id="inpNum" placeholder="01XXXXXXXXX"
            inputmode="tel" autocomplete="tel" required/>
          <span class="ico"><i class="fas fa-mobile-screen-button"></i></span>
        </div>
      </div>
      <div class="field">
        <label>كلمة المرور</label>
        <div class="input-box">
          <input type="password" id="inpPw" placeholder="••••••••"
            autocomplete="current-password" required/>
          <span class="ico"><i class="fas fa-lock"></i></span>
        </div>
      </div>
      <button class="btn-login" id="loginBtn" onclick="doLogin()">
        <i class="fas fa-right-to-bracket"></i>&nbsp; دخول
      </button>
    </div>
    <div class="sec-note">
      <i class="fas fa-shield-halved"></i> اتصال آمن ومشفر
    </div>
  </div>
</div>

<!-- ══ APP ══ -->
<div id="s-app" class="screen">
  <div class="topbar">
    <div class="tbar-brand">
      <div class="tbar-logo">
        <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt=""/>
      </div>
      <div class="tbar-name">TALASHNY</div>
    </div>
    <div class="tbar-right">
      <div class="tbar-num" id="topNum">—</div>
      <div class="tbar-live">
        <!-- النقطة الخضرا — اضغطها 5 مرات للأدمن -->
        <div class="live-dot" id="liveDotBtn" onclick="handleLiveTap()"></div>
        متصل
      </div>
    </div>
  </div>

  <div class="appwrap">
    <div class="toprow">
      <div></div>
      <button class="btn-logout" id="logoutBtn">
        <i class="fas fa-power-off"></i>&nbsp;خروج
      </button>
    </div>
    <div class="stats-bar">
      <div class="stat s-red">
        <div class="stat-val" id="st-total">—</div>
        <div class="stat-lbl">كروت</div>
      </div>
      <div class="stat s-gold">
        <div class="stat-val" id="st-max">—</div>
        <div class="stat-lbl">أعلى فئة</div>
      </div>
      <div class="stat s-green">
        <div class="stat-val">
          <i class="fas fa-circle" style="font-size:.5rem"></i>
          <span id="st-online">—</span>
        </div>
        <div class="stat-lbl">متصل الآن</div>
      </div>
    </div>
    <div class="timer-row">
      <div class="t-ring">
        <svg viewBox="0 0 40 40">
          <circle class="t-bg"   cx="20" cy="20" r="16"/>
          <circle class="t-prog" id="tprog" cx="20" cy="20" r="16"/>
        </svg>
        <div class="t-count" id="tnum">15</div>
      </div>
      <div class="t-info">
        <div class="t-label">تحديث تلقائي</div>
        <div class="t-sub">كل 15 ثانية</div>
      </div>
      <div class="live-badge"><div class="lb-dot"></div>LIVE</div>
    </div>
    <div class="sec-row">
      <div class="sec-title"><div class="sec-line"></div>الكروت المتاحة</div>
      <div class="sec-badge" id="ccnt">—</div>
    </div>
    <div id="cardsWrap">
      <div class="empty">
        <i class="fas fa-spinner fa-spin" style="color:var(--red);opacity:.8"></i>
        <p>جاري التحميل...</p>
      </div>
    </div>
  </div>

  <nav class="botnav">
    <a href="https://t.me/FY_TF" target="_blank" class="nav-link">
      <i class="fab fa-telegram-plane"></i><span>تيليجرام</span>
    </a>
    <a href="https://wa.me/message/U6AIKBGFCNCQK1" target="_blank" class="nav-link">
      <i class="fab fa-whatsapp"></i><span>واتساب</span>
    </a>
    <a href="https://www.facebook.com/VI808IV" target="_blank" class="nav-link">
      <i class="fab fa-facebook-f"></i><span>فيسبوك</span>
    </a>
  </nav>
</div>

<!-- ══ SLIDE NOTIFICATION ══ -->
<div class="notif-slide" id="notifSlide" onclick="notifClick()">
  <div class="notif-top-row">
    <div class="notif-slide-icon" id="notifIcon">
      <i class="fas fa-bell"></i>
    </div>
    <div class="notif-slide-body">
      <div class="notif-slide-title">
        <span id="notifTitle">TALASHNY</span>
        <span class="notif-slide-app">الآن</span>
      </div>
      <div class="notif-slide-text" id="notifText"></div>
    </div>
  </div>
  <a class="notif-action-btn" id="notifActionBtn" style="display:none" target="_blank">
    <i class="fas fa-arrow-up-right-from-square"></i>
    <span id="notifBtnLabel">افتح الرابط</span>
  </a>
  <div class="notif-bar"><div class="notif-bar-fill" id="notifBarFill"></div></div>
</div>

<!-- ══ ADMIN OVERLAY ══ -->
<div class="admin-overlay" id="adminOverlay">
  <div class="admin-panel">
    <div class="admin-drag-bar"></div>

    <!-- Head -->
    <div class="admin-head">
      <div class="admin-head-left">
        <div class="admin-head-icon"><i class="fas fa-tower-broadcast"></i></div>
        <div>
          <div class="admin-head-title">ADMIN</div>
          <div class="admin-head-sub">لوحة التحكم</div>
        </div>
      </div>
      <div class="admin-close" onclick="closeAdmin()"><i class="fas fa-xmark"></i></div>
    </div>

    <!-- Auth -->
    <div class="admin-auth" id="adminAuth">
      <div class="admin-auth-title">أدخل كلمة المرور</div>
      <div class="pin-dots" id="pinDots">
        <div class="pin-dot"></div>
        <div class="pin-dot"></div>
        <div class="pin-dot"></div>
        <div class="pin-dot"></div>
        <div class="pin-dot"></div>
        <div class="pin-dot"></div>
      </div>
      <div class="auth-err" id="authErr">❌ كلمة المرور غلط</div>
      <div class="pw-field-wrap">
        <span class="ico"><i class="fas fa-key"></i></span>
        <input type="password" id="adminPwInput" placeholder="••••••••••" onkeydown="if(event.key==='Enter')checkAdminPw()"/>
      </div>
      <button class="btn-auth" onclick="checkAdminPw()">
        <i class="fas fa-unlock-keyhole"></i>&nbsp; دخول
      </button
