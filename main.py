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
        session["token"] = res["access_token"]
        session["token_exp"] = time.time() + int(res.get("expires_in",3600)) - 120
        return True
    return False

# ══════════════════════════════════════════════════════
#  HTML  (كل حاجة في ملف واحد)
# ══════════════════════════════════════════════════════

PAGE = r"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>TALASHNY — كروت رمضان</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Bebas+Neue&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
<style>
/* ─── BASE ─── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow-x:hidden}
body{font-family:'Cairo',sans-serif;background:#0c0c0c;color:#f0f0f0;min-height:100vh;padding-bottom:80px}
img{pointer-events:none;-webkit-user-drag:none}
#bgc{position:fixed;inset:0;z-index:0;pointer-events:none}

/* ─── SPLASH ─── */
#splash{
  position:fixed;inset:0;z-index:9999;
  background:#000;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:0;overflow:hidden;
}
#splash.out{animation:splashFade .9s cubic-bezier(.4,0,.2,1) forwards}
@keyframes splashFade{0%{opacity:1;transform:scale(1)}60%{opacity:1;transform:scale(1.04)}100%{opacity:0;transform:scale(.96)}}

.ss{position:absolute;border-radius:50%;background:#fff;
    animation:twinkle var(--d,2s) ease-in-out infinite;animation-delay:var(--dl,0s)}
@keyframes twinkle{0%,100%{opacity:.08}50%{opacity:.65}}

.sp-moon{
  width:200px;height:200px;position:relative;
  opacity:0;transform:scale(1.5) translateY(-20px);
  animation:moonIn 1.8s cubic-bezier(.34,1.25,.64,1) .4s forwards;
}
@keyframes moonIn{to{opacity:1;transform:scale(1) translateY(0)}}
.sp-moon svg{width:100%;height:100%}

.sp-vf{
  position:absolute;top:50%;left:50%;
  width:75px;
  transform:translate(-50%,-50%) scale(.15);
  opacity:0;
  animation:vfIn 1.1s cubic-bezier(.34,1.6,.64,1) 1.8s forwards;
  filter:drop-shadow(0 2px 10px rgba(255,255,255,.3));
}
@keyframes vfIn{to{opacity:1;transform:translate(-50%,-50%) scale(1)}}

.sp-title{
  margin-top:20px;
  font-size:clamp(1.9rem,8vw,2.9rem);
  font-weight:900;color:#e8c76f;letter-spacing:3px;
  opacity:0;transform:translateY(22px);
  animation:fadeUp 1s ease 2.6s forwards;
  text-shadow:0 0 40px rgba(232,199,111,.45);
}
.sp-sub{
  margin-top:5px;font-size:.92rem;color:rgba(232,199,111,.55);letter-spacing:1px;
  opacity:0;animation:fadeUp .8s ease 3.2s forwards;
}
@keyframes fadeUp{to{opacity:1;transform:translateY(0)}}

.sp-dots{position:absolute;bottom:52px;display:flex;gap:7px;opacity:0;animation:fadeUp .5s ease 3.4s forwards}
.sp-dot{width:7px;height:7px;border-radius:50%;background:rgba(232,199,111,.45);
        animation:dotPop 1.3s ease-in-out infinite}
.sp-dot:nth-child(1){animation-delay:0s}
.sp-dot:nth-child(2){animation-delay:.2s;background:rgba(230,0,0,.55)}
.sp-dot:nth-child(3){animation-delay:.4s}
@keyframes dotPop{0%,100%{transform:scaleY(.45);opacity:.4}50%{transform:scaleY(1.4);opacity:1}}

/* ─── PAGES ─── */
.page{display:none;position:relative;z-index:10}
.page.active{display:block}

/* ─── LOGIN ─── */
#login-page{min-height:100vh;overflow:hidden}
.lp-bg{
  position:fixed;inset:0;z-index:1;pointer-events:none;
  background:
    radial-gradient(ellipse 80% 55% at 50% -5%, rgba(230,0,0,.16) 0%, transparent 65%),
    radial-gradient(ellipse 50% 35% at 80% 90%, rgba(232,199,111,.05) 0%, transparent 60%),
    #0c0c0c;
}
.lp-grid{
  position:fixed;inset:0;z-index:1;pointer-events:none;
  background-image:
    linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);
  background-size:38px 38px;
  mask-image:radial-gradient(ellipse 85% 85% at 50% 50%,#000 20%,transparent 100%);
}
.lp-wrap{
  position:relative;z-index:10;
  max-width:400px;margin:0 auto;padding:0 20px 40px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:100vh;
}

/* الأيقون المركزي */
.lp-icon{
  display:flex;flex-direction:column;align-items:center;gap:0;
  margin-bottom:16px;
  animation:iconFloat 3.5s ease-in-out infinite;
}
@keyframes iconFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}

.lp-ring{
  width:100px;height:100px;border-radius:28px;
  background:linear-gradient(145deg,#180000 0%,#050505 100%);
  border:1.5px solid rgba(230,0,0,.3);
  display:flex;align-items:center;justify-content:center;
  box-shadow:
    0 0 0 8px rgba(230,0,0,.04),
    0 0 50px rgba(230,0,0,.18),
    0 0 100px rgba(230,0,0,.07),
    inset 0 1px 0 rgba(255,255,255,.04);
  animation:ringPulse 3s ease-in-out infinite;
  position:relative;
}
.lp-ring::after{
  content:'';position:absolute;inset:-8px;border-radius:34px;
  border:1px solid rgba(230,0,0,.1);
  animation:ringPulse 3s ease-in-out infinite reverse;
}
@keyframes ringPulse{
  0%,100%{box-shadow:0 0 0 8px rgba(230,0,0,.04),0 0 50px rgba(230,0,0,.18),0 0 100px rgba(230,0,0,.07),inset 0 1px 0 rgba(255,255,255,.04)}
  50%{box-shadow:0 0 0 12px rgba(230,0,0,.07),0 0 70px rgba(230,0,0,.28),0 0 140px rgba(230,0,0,.12),inset 0 1px 0 rgba(255,255,255,.04)}
}
.lp-ring img{width:58px;filter:drop-shadow(0 0 10px rgba(255,80,80,.25))}

/* شريط نبض */
.lp-bars{display:flex;gap:3px;align-items:center;justify-content:center;margin-top:10px}
.lp-bar{width:3px;border-radius:2px;background:rgba(230,0,0,.5);animation:barAnim 1.3s ease-in-out infinite}
.lp-bar:nth-child(1){height:8px;animation-delay:0s}
.lp-bar:nth-child(2){height:16px;animation-delay:.13s;background:rgba(232,199,111,.6)}
.lp-bar:nth-child(3){height:22px;animation-delay:.26s}
.lp-bar:nth-child(4){height:14px;animation-delay:.39s;background:rgba(232,199,111,.6)}
.lp-bar:nth-child(5){height:8px;animation-delay:.52s}
@keyframes barAnim{0%,100%{transform:scaleY(.35);opacity:.35}50%{transform:scaleY(1);opacity:1}}

.lp-name{
  font-size:1.85rem;font-weight:900;letter-spacing:6px;text-transform:uppercase;
  background:linear-gradient(90deg,#a0a0a0 0%,#fff 25%,#c8c8c8 50%,#fff 75%,#a0a0a0 100%);
  background-size:300% 100%;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:shine 4s linear infinite;
  margin-top:10px;
}
@keyframes shine{0%{background-position:300% center}100%{background-position:-300% center}}
.lp-tag{font-size:.68rem;color:rgba(232,199,111,.5);letter-spacing:2px;margin-top:3px;margin-bottom:22px}

/* error */
.err{
  display:flex;align-items:center;gap:8px;
  background:rgba(230,0,0,.07);border:1px solid rgba(230,0,0,.2);
  border-radius:12px;padding:10px 14px;
  font-size:.75rem;font-weight:700;color:#ff6060;
  width:100%;margin-bottom:10px;
  animation:shake .35s ease;
}
@keyframes shake{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-5px)}50%{transform:translateX(5px)}}

/* الكارت */
.lp-card{
  width:100%;
  background:rgba(255,255,255,.025);
  border:1px solid rgba(255,255,255,.07);
  border-radius:22px;
  padding:22px 18px 18px;
  backdrop-filter:blur(16px);
  box-shadow:0 20px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.04);
}
.lp-card-hd{
  font-size:.56rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:rgba(255,255,255,.2);text-align:center;margin-bottom:16px;
}

/* fields */
.field{display:flex;flex-direction:column;gap:5px;margin-bottom:11px}
.field label{font-size:.58rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
             color:rgba(255,255,255,.28);text-align:right;transition:color .2s}
.field:focus-within label{color:rgba(230,0,0,.75)}
.inpbox{
  position:relative;display:flex;align-items:center;
  background:rgba(0,0,0,.45);
  border:1.5px solid rgba(255,255,255,.07);
  border-radius:13px;direction:rtl;overflow:hidden;
  transition:border-color .25s,box-shadow .25s;
}
.inpbox::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,#c9a84c,#e60000,#c9a84c);
  transform:scaleX(0);transform-origin:right;
  transition:transform .35s cubic-bezier(.34,1.4,.64,1);
}
.field:focus-within .inpbox::after{transform:scaleX(1)}
.field:focus-within .inpbox{border-color:rgba(230,0,0,.28);box-shadow:0 0 0 3px rgba(230,0,0,.06)}
.inpbox input{
  flex:1;background:none;border:none;outline:none;
  font-family:'Cairo',sans-serif;font-size:.9rem;font-weight:700;color:#f0f0f0;
  padding:12px 13px;direction:rtl;text-align:right;order:1;
}
.inpbox input::placeholder{color:rgba(255,255,255,.16);font-weight:400;font-size:.78rem}
.inpbox .ico{width:42px;text-align:center;font-size:.82rem;color:rgba(255,255,255,.18);order:2;flex-shrink:0;transition:color .2s}
.field:focus-within .inpbox .ico{color:#e60000}

/* زرار */
.loginbtn{
  width:100%;padding:13px;border:none;border-radius:13px;
  background:linear-gradient(135deg,#b50000,#e60000,#d00000);
  font-family:'Cairo',sans-serif;font-size:.92rem;font-weight:900;color:#fff;
  cursor:pointer;position:relative;overflow:hidden;
  box-shadow:0 5px 28px rgba(230,0,0,.32);
  transition:transform .2s,box-shadow .2s;margin-top:3px;
}
.loginbtn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.11),transparent 52%)}
.loginbtn::after{content:'';position:absolute;top:0;left:-110%;width:55%;height:100%;
  background:linear-gradient(105deg,transparent,rgba(255,255,255,.14),transparent);transition:left .5s}
.loginbtn:hover::after{left:155%}
.loginbtn:hover{transform:translateY(-2px);box-shadow:0 8px 36px rgba(230,0,0,.42)}
.loginbtn:active{transform:scale(.97)!important}
.loginbtn:disabled{opacity:.45;cursor:wait}
.loginbtn i,.loginbtn span{position:relative;z-index:1}
.sec-note{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:9px;
          font-size:.56rem;color:rgba(255,255,255,.18)}
.sec-note i{color:rgba(0,230,118,.45)}

/* ─── APP ─── */
.topbar{
  position:fixed;top:0;left:0;right:0;height:72px;
  background:rgba(5,5,5,.94);backdrop-filter:blur(24px);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 16px;
  border-bottom:1px solid rgba(255,255,255,.05);
  box-shadow:0 2px 24px rgba(0,0,0,.7);
  z-index:200;
}
.tbar-left{display:flex;align-items:center;gap:9px}
.tbar-ico{
  width:34px;height:34px;border-radius:10px;
  background:linear-gradient(135deg,#b00,#e60000);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 12px rgba(230,0,0,.4);
}
.tbar-ico img{width:20px;filter:brightness(0) invert(1)}
.tbar-name{
  font-size:1rem;font-weight:900;letter-spacing:3px;text-transform:uppercase;
  background:linear-gradient(90deg,#aaa,#fff,#aaa);background-size:200% 100%;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:shine 4s linear infinite;
}
.tbar-right{display:flex;flex-direction:column;align-items:flex-end;gap:1px}
.tbar-num{font-size:.8rem;font-weight:800;color:#f0f0f0}
.tbar-online{display:flex;align-items:center;gap:4px;font-size:.52rem;font-weight:700;color:#00e676;letter-spacing:.5px}
.tbar-online::before{content:'';width:5px;height:5px;border-radius:50%;background:#00e676;
  box-shadow:0 0 5px #00e676;animation:onlinePulse 2s infinite}
@keyframes onlinePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(1.5)}}

.appwrap{max-width:480px;margin:0 auto;padding:84px 13px 0}

.toprow{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.logoutbtn{
  display:flex;align-items:center;gap:5px;
  background:transparent;border:1px solid rgba(255,255,255,.07);
  border-radius:100px;padding:6px 13px;
  font-family:'Cairo',sans-serif;font-size:.65rem;font-weight:700;
  color:rgba(255,255,255,.3);cursor:pointer;text-decoration:none;transition:all .2s;
}
.logoutbtn:hover{border-color:rgba(230,0,0,.3);color:#e60000;background:rgba(230,0,0,.05)}

/* تايمر */
.timer{
  display:flex;align-items:center;gap:10px;
  background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);
  border-radius:14px;padding:9px 14px;margin-bottom:11px;
}
.tring{width:34px;height:34px;position:relative;flex-shrink:0}
.tring svg{width:34px;height:34px;transform:rotate(-90deg)}
.tbg{fill:none;stroke:rgba(255,255,255,.04);stroke-width:3}
.tprog{fill:none;stroke:#e60000;stroke-width:3;stroke-linecap:round;
  stroke-dasharray:94;stroke-dashoffset:0;
  transition:stroke-dashoffset .9s linear,stroke .3s;
  filter:drop-shadow(0 0 3px #e60000)}
.tnum{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:.68rem;font-weight:900}
.tinfo{flex:1}
.tlabel{font-size:.7rem;font-weight:700;color:rgba(255,255,255,.45)}
.tsub{font-size:.54rem;color:rgba(255,255,255,.22);margin-top:1px}
.tlive{display:flex;align-items:center;gap:4px;font-size:.54rem;font-weight:700;
  color:#e60000;letter-spacing:1px;text-transform:uppercase}
.tlive::before{content:'';width:5px;height:5px;border-radius:50%;background:#e60000;
  box-shadow:0 0 5px #e60000;animation:blink 1s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}

/* عنوان القسم */
.secrow{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}
.sectitle{font-size:.58rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:rgba(255,255,255,.28);display:flex;align-items:center;gap:7px}
.sectitle::before{content:'';width:13px;height:2px;background:linear-gradient(90deg,#e60000,#c9a84c)}
.secbadge{font-size:.58rem;font-weight:700;color:rgba(255,255,255,.28);
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
  padding:2px 9px;border-radius:100px}

/* ─── CARD ─── */
.card{
  background:rgba(255,255,255,.025);
  border:1px solid rgba(255,255,255,.07);
  border-radius:18px;margin-bottom:9px;overflow:hidden;
  animation:cardIn .38s cubic-bezier(.34,1.4,.64,1) both;
  animation-delay:calc(var(--i,0)*.055s);
  transition:transform .2s,border-color .2s,box-shadow .2s;
}
@keyframes cardIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.card:hover{transform:translateY(-2px);border-color:rgba(230,0,0,.18);box-shadow:0 8px 28px rgba(0,0,0,.45)}

/* الصف العلوي */
.ctop{display:flex;align-items:stretch;border-bottom:1px solid rgba(255,255,255,.055)}

/* خانة الفئة */
.camount{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:12px 15px;min-width:76px;flex-shrink:0;
  background:linear-gradient(160deg,rgba(230,0,0,.13) 0%,rgba(230,0,0,.04) 100%);
  border-left:1px solid rgba(230,0,0,.13);
}
.camount-n{font-family:'Bebas Neue',sans-serif;font-size:2.2rem;color:#fff;line-height:1}
.camount-u{font-size:.5rem;font-weight:700;color:rgba(255,255,255,.28);letter-spacing:.5px;margin-top:2px}

/* بيانات */
.cinfo{flex:1;padding:11px 13px;display:flex;flex-direction:column;justify-content:center;gap:5px}
.chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:100px;font-size:.58rem;font-weight:700}
.chip-gold{background:rgba(201,168,76,.08);color:#f0d080;border:1px solid rgba(201,168,76,.16)}
.chip-blue{background:rgba(99,179,237,.06);color:#7ec8e3;border:1px solid rgba(99,179,237,.12)}
.chip i{font-size:.48rem}

/* سيريال */
.cserial{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 13px;background:rgba(0,0,0,.22);
  border-bottom:1px solid rgba(255,255,255,.05);
  gap:8px;
}
.serial-val{font-family:monospace;font-size:.88rem;letter-spacing:2.5px;color:#eee;font-weight:600;flex:1;text-align:right}
.copybtn{
  width:27px;height:27px;border-radius:8px;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:rgba(255,255,255,.28);flex-shrink:0;transition:all .2s;
}
.copybtn:hover{background:rgba(230,0,0,.1);border-color:rgba(230,0,0,.28);color:#e60000}
.copybtn:active{transform:scale(.82)}
.copybtn i{font-size:.62rem}

/* أزرار */
.cbtns{display:flex;gap:6px;padding:8px 9px}
.cbtn-charge{
  flex:1;display:flex;align-items:center;justify-content:center;gap:5px;
  padding:9px 6px;border:none;border-radius:10px;
  background:#e60000;color:#fff;
  font-family:'Cairo',sans-serif;font-size:.72rem;font-weight:800;
  cursor:pointer;position:relative;overflow:hidden;
  box-shadow:0 4px 14px rgba(230,0,0,.28);transition:all .2s;
}
.cbtn-charge::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.11),transparent 55%)}
.cbtn-charge:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(230,0,0,.38)}
.cbtn-charge.done{background:#00c85a;box-shadow:0 4px 14px rgba(0,200,90,.28)}
.cbtn-charge.loading{opacity:.55;pointer-events:none}
.cbtn-charge:active{transform:scale(.95)!important}
.cbtn-charge i,.cbtn-charge span{position:relative;z-index:1}

.cbtn-dial{
  flex:1;display:flex;align-items:center;justify-content:center;gap:5px;
  padding:9px 6px;border-radius:10px;
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);
  color:rgba(255,255,255,.55);
  font-family:'Cairo',sans-serif;font-size:.72rem;font-weight:800;
  cursor:pointer;text-decoration:none;transition:all .2s;
}
.cbtn-dial:hover{background:rgba(255,255,255,.08);color:#fff}
.cbtn-dial:active{transform:scale(.95)}
.cbtn-dial i{font-size:.7rem}

/* فارغ */
.empty{
  text-align:center;padding:46px 20px;
  background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.055);
  border-radius:18px;
}
.empty i{font-size:2.2rem;color:rgba(255,255,255,.13);display:block;margin-bottom:10px}
.empty p{font-size:.82rem;color:rgba(255,255,255,.32)}
.empty small{font-size:.62rem;color:rgba(255,255,255,.18);display:block;margin-top:4px}

/* توست */
.toast{
  position:fixed;bottom:86px;left:50%;
  transform:translateX(-50%) translateY(12px);
  background:rgba(8,8,8,.96);border:1px solid rgba(255,255,255,.07);
  border-radius:100px;padding:9px 22px;
  font-family:'Cairo',sans-serif;font-size:.72rem;font-weight:700;
  color:#fff;opacity:0;pointer-events:none;z-index:9998;
  white-space:nowrap;backdrop-filter:blur(20px);
  transition:all .3s cubic-bezier(.34,1.4,.64,1);
}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.toast.ok{border-color:rgba(0,230,118,.3);color:#00e676}
.toast.err{border-color:rgba(230,0,0,.3);color:#ff5050}

/* ناف */
.botnav{
  position:fixed;bottom:0;left:0;right:0;
  background:rgba(4,4,4,.95);backdrop-filter:blur(22px);
  border-top:1px solid rgba(255,255,255,.05);
  display:flex;justify-content:space-around;
  padding:10px 0 16px;z-index:100;
}
.botnav a{
  text-decoration:none;color:rgba(255,255,255,.22);
  display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:4px 22px;border-radius:10px;
  font-size:.5rem;font-weight:700;letter-spacing:.5px;
  transition:color .2s,transform .2s;
}
.botnav a:hover{color:#e60000;transform:translateY(-2px)}
.botnav i{font-size:1.2rem}
</style>
</head>
<body>

<!-- ── PARTICLES ── -->
<canvas id="bgc"></canvas>

<!-- ══════════════════════ SPLASH ══════════════════════ -->
<div id="splash">
  <div id="sStars"></div>

  <div class="sp-moon">
    <svg viewBox="0 0 200 200" fill="none">
      <defs>
        <radialGradient id="mg" cx="32%" cy="28%" r="68%">
          <stop offset="0%" stop-color="#f7e99a"/>
          <stop offset="45%" stop-color="#c9a84c"/>
          <stop offset="100%" stop-color="#6e4e10"/>
        </radialGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="mc"><circle cx="100" cy="100" r="82"/></clipPath>
      </defs>
      <!-- هالتين -->
      <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(232,199,111,.1)" stroke-width="1"/>
      <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(232,199,111,.06)" stroke-width="1"/>
      <!-- القرص -->
      <circle cx="100" cy="100" r="82" fill="url(#mg)" filter="url(#glow)"/>
      <!-- قطع الهلال -->
      <circle cx="136" cy="88" r="72" fill="#000" clip-path="url(#mc)"/>
      <!-- حافة الهلال -->
      <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(232,199,111,.22)" stroke-width="1.5"/>
      <!-- نجمة كبيرة -->
      <polygon points="158,44 160.2,50.5 167,50.5 161.5,54.5 163.5,61 158,57 152.5,61 154.5,54.5 149,50.5 155.8,50.5"
               fill="rgba(247,233,154,.95)" filter="url(#glow)"/>
      <!-- نجمة صغيرة -->
      <polygon points="175,22 176.2,25.5 180,25.5 177,27.6 178.1,31 175,28.9 171.9,31 173,27.6 170,25.5 173.8,25.5"
               fill="rgba(247,233,154,.55)"/>
    </svg>
    <img src="https://tlashane.serv00.net/vo/vodafone2.png" class="sp-vf" alt="">
  </div>

  <div class="sp-title">كروت رمضان</div>
  <div class="sp-sub">عروض الشهر الكريم &nbsp;•&nbsp; اشحن واستمتع</div>

  <div class="sp-dots">
    <div class="sp-dot"></div>
    <div class="sp-dot"></div>
    <div class="sp-dot"></div>
  </div>
</div>

<!-- ══════════════════════ LOGIN ══════════════════════ -->
<div id="login-page" class="page">
  <div class="lp-bg"></div>
  <div class="lp-grid"></div>
  <div class="lp-wrap">

    <div class="lp-icon">
      <div class="lp-ring">
        <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt="">
      </div>
      <div class="lp-bars">
        <div class="lp-bar"></div>
        <div class="lp-bar"></div>
        <div class="lp-bar"></div>
        <div class="lp-bar"></div>
        <div class="lp-bar"></div>
      </div>
    </div>

    <div class="lp-name">TALASHNY</div>
    <div class="lp-tag">كروت رمضان &nbsp;•&nbsp; عروض فودافون</div>

    <div id="errBox" class="err" style="display:none">
      <i class="fas fa-circle-exclamation"></i>
      <span id="errMsg"></span>
    </div>

    <div class="lp-card">
      <div class="lp-card-hd">تسجيل الدخول بحسابك</div>
      <form id="loginForm" onsubmit="doLogin(event)">
        <div class="field">
          <label>رقم الموبايل</label>
          <div class="inpbox">
            <input type="tel" id="inpNum" placeholder="01XXXXXXXXX" inputmode="tel" autocomplete="tel" required/>
            <span class="ico"><i class="fas fa-mobile-screen-button"></i></span>
          </div>
        </div>
        <div class="field">
          <label>كلمة المرور</label>
          <div class="inpbox">
            <input type="password" id="inpPw" placeholder="••••••••" autocomplete="current-password" required/>
            <span class="ico"><i class="fas fa-lock"></i></span>
          </div>
        </div>
        <button type="submit" class="loginbtn" id="loginBtn">
          <i class="fas fa-right-to-bracket"></i>&nbsp; <span>دخول</span>
        </button>
      </form>
      <div class="sec-note"><i class="fas fa-shield-halved"></i> اتصال آمن ومشفر</div>
    </div>

  </div>
</div>

<!-- ══════════════════════ APP ══════════════════════ -->
<div id="app-page" class="page">

  <div class="topbar">
    <div class="tbar-left">
      <div class="tbar-ico">
        <img src="https://tlashane.serv00.net/vo/vodafone2.png" alt="">
      </div>
      <div class="tbar-name">TALASHNY</div>
    </div>
    <div class="tbar-right">
      <div class="tbar-num" id="topNum">—</div>
      <div class="tbar-online">متصل الآن</div>
    </div>
  </div>

  <div class="appwrap">

    <div class="toprow">
      <div></div>
      <button class="logoutbtn" id="logoutBtn"><i class="fas fa-power-off"></i> خروج</button>
    </div>

    <div class="timer">
      <div class="tring">
        <svg viewBox="0 0 40 40">
          <circle class="tbg" cx="20" cy="20" r="15"/>
          <circle class="tprog" id="tprog" cx="20" cy="20" r="15"/>
        </svg>
        <div class="tnum" id="tnum">15</div>
      </div>
      <div class="tinfo">
        <div class="tlabel">تحديث تلقائي</div>
        <div class="tsub">كل 15 ثانية</div>
      </div>
      <div class="tlive">LIVE</div>
    </div>

    <div class="secrow">
      <div class="sectitle">الكروت المتاحة</div>
      <div class="secbadge" id="ccnt">—</div>
    </div>

    <div id="cardsWrap">
      <div class="empty">
        <i class="fas fa-spinner fa-spin" style="color:#e60000;opacity:.8"></i>
        <p>جاري التحميل...</p>
      </div>
    </div>
  </div>
</div>

<!-- ── TOAST ── -->
<div class="toast" id="toastEl"></div>

<!-- ── NAV ── -->
<nav class="botnav">
  <a href="https://t.me/FY_TF" target="_blank"><i class="fab fa-telegram-plane"></i><span>تيليجرام</span></a>
  <a href="https://wa.me/message/U6AIKBGFCNCQK1" target="_blank"><i class="fab fa-whatsapp"></i><span>واتساب</span></a>
  <a href="https://www.facebook.com/VI808IV" target="_blank"><i class="fab fa-facebook-f"></i><span>فيسبوك</span></a>
</nav>

<script>
/* ── PARTICLES ── */
(function(){
  const c=document.getElementById('bgc'),x=c.getContext('2d');
  let W,H,p=[];
  const rs=()=>{W=c.width=innerWidth;H=c.height=innerHeight};
  rs();addEventListener('resize',rs);
  for(let i=0;i<52;i++)p.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.28,vy:(Math.random()-.5)*.28,r:Math.random()*1.3+.3,a:Math.random()});
  function draw(){
    x.clearRect(0,0,W,H);
    p.forEach(q=>{
      q.x+=q.vx;q.y+=q.vy;
      if(q.x<0||q.x>W)q.vx*=-1;if(q.y<0||q.y>H)q.vy*=-1;
      x.beginPath();x.arc(q.x,q.y,q.r,0,Math.PI*2);
      x.fillStyle=`rgba(230,0,0,${q.a*.18})`;x.fill();
    });
    for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
      const dx=p[i].x-p[j].x,dy=p[i].y-p[j].y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<108){x.beginPath();x.moveTo(p[i].x,p[i].y);x.lineTo(p[j].x,p[j].y);
        x.strokeStyle=`rgba(230,0,0,${(1-d/108)*.045})`;x.lineWidth=.5;x.stroke()}
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── STARS ── */
(function(){
  const el=document.getElementById('sStars');
  for(let i=0;i<85;i++){
    const s=document.createElement('div');s.className='ss';
    const z=Math.random()*2+.5;
    s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${z}px;height:${z}px;--d:${Math.random()*2.2+1.4}s;--dl:${Math.random()*4}s;opacity:${Math.random()*.45+.08}`;
    el.appendChild(s);
  }
})();

/* ── UTILS ── */
const _=id=>document.getElementById(id);
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function showToast(msg,t=''){
  const el=_('toastEl');el.textContent=msg;el.className='toast show'+(t?' '+t:'');
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2800);
}

/* ── STATE ── */
let loggedIn=false, userNumber='', timerInt=null;

/* ── PAGES ── */
function show(pg){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  _(pg+'-page').classList.add('active');
}

/* ── SPLASH → PAGE ── */
setTimeout(()=>{
  _('splash').classList.add('out');
  setTimeout(async()=>{
    _('splash').style.display='none';
    // check session
    try{
      const r=await fetch('/check');const d=await r.json();
      if(d.logged){loggedIn=true;userNumber=d.number;_('topNum').textContent=d.number;show('app');startCycle();}
      else show('login');
    }catch{show('login')}
  },900);
},5200);

/* ── LOGIN ── */
async function doLogin(e){
  e.preventDefault();
  const num=_('inpNum').value.trim(),pw=_('inpPw').value.trim();
  const btn=_('loginBtn');
  btn.disabled=true;
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>&nbsp; <span>جاري التحقق...</span>';
  _('errBox').style.display='none';
  try{
    const fd=new FormData();fd.append('number',num);fd.append('password',pw);
    const r=await fetch('/login',{method:'POST',body:fd});
    const d=await r.json();
    if(d.ok){
      loggedIn=true;userNumber=d.number;
      _('topNum').textContent=d.number;
      show('app');startCycle();
    }else{
      _('errMsg').textContent=d.error||'الرقم أو الباسورد غلط';
      _('errBox').style.display='flex';
    }
  }catch{
    _('errMsg').textContent='خطأ في الاتصال — تحقق من النت';
    _('errBox').style.display='flex';
  }
  btn.disabled=false;
  btn.innerHTML='<i class="fas fa-right-to-bracket"></i>&nbsp; <span>دخول</span>';
}

/* ── LOGOUT ── */
_('logoutBtn').onclick=async()=>{
  await fetch('/logout');
  loggedIn=false;userNumber='';
  clearInterval(timerInt);
  show('login');
};

/* ── COPY ── */
function copySerial(btn){
  const s=btn.closest('.cserial').querySelector('.serial-val').textContent.trim();
  const ok=()=>{
    const o=btn.innerHTML;
    btn.innerHTML='<i class="fas fa-check" style="color:#00e676"></i>';
    setTimeout(()=>btn.innerHTML=o,1500);
    showToast('✅ تم نسخ الكود','ok');
  };
  if(navigator.clipboard&&location.protocol==='https:')navigator.clipboard.writeText(s).then(ok).catch(fb);else fb();
  function fb(){const t=document.createElement('textarea');t.value=s;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch{}document.body.removeChild(t);ok()}
}

/* ── CHARGE ── */
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

/* ── RENDER ── */
function renderCards(list){
  const el=_('cardsWrap'),cnt=_('ccnt');
  if(!list||!list.length){
    cnt.textContent='0';
    el.innerHTML='<div class="empty"><i class="fas fa-inbox"></i><p>لا توجد عروض متاحة الآن</p><small>يتجدد البحث تلقائياً...</small></div>';
    return;
  }
  cnt.textContent=list.length+' كرت';
  el.innerHTML=list.map((p,i)=>{
    const ussd='*858*'+p.serial.replace(/\s/g,'')+'#';
    return`<div class="card" style="--i:${i}">
      <div class="ctop">
        <div class="camount">
          <div class="camount-n">${esc(p.amount)}</div>
          <div class="camount-u">جنيه</div>
        </div>
        <div class="cinfo">
          <span class="chip chip-gold"><i class="fas fa-gift"></i>&nbsp;${esc(p.gift)} وحدة هدية</span>
          <span class="chip chip-blue"><i class="fas fa-rotate"></i>&nbsp;${esc(p.remaining)} متبقي</span>
        </div>
      </div>
      <div class="cserial">
        <span class="serial-val">${esc(p.serial)}</span>
        <button onclick="copySerial(this)" class="copybtn"><i class="fas fa-clone"></i></button>
      </div>
      <div class="cbtns">
        <button class="cbtn-charge" onclick="chargeCard('${esc(p.serial)}',this)">
          <i class="fas fa-bolt"></i>&nbsp;<span>شحن أونلاين</span>
        </button>
        <a href="tel:${encodeURIComponent(ussd)}" class="cbtn-dial">
          <i class="fas fa-phone"></i>&nbsp;<span>شحن بالهاتف</span>
        </a>
      </div>
    </div>`;
  }).join('');
}

/* ── TIMER ── */
const TOTAL=15, CIRC=2*Math.PI*15;
function startTimer(cb){
  let t=TOTAL;
  const num=_('tnum'),prog=_('tprog');
  if(!num||!prog)return;
  prog.style.strokeDasharray=CIRC;prog.style.strokeDashoffset=0;
  clearInterval(timerInt);
  timerInt=setInterval(()=>{
    t--;
    num.textContent=Math.max(t,0);
    prog.style.strokeDashoffset=CIRC*(1-t/TOTAL);
    prog.style.stroke=t<=4?'#ff3333':'#e60000';
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

# ══════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════

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

# ══════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n"+"═"*40)
    print("  TALASHNY  |  http://localhost:5000")
    print("═"*40+"\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
