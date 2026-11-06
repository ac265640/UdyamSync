"""Built-in, hand-checked text for English, Hindi and Marathi.

Offline mode uses these templates directly. When an LLM is configured, the same facts are
rephrased (and translated into the other 7 data languages) — but prices and product facts
always come from the structured quote, never from the model.
"""
from __future__ import annotations

LANGUAGES = {
    "en": "English", "hi": "Hindi", "mr": "Marathi", "gu": "Gujarati", "ta": "Tamil",
    "te": "Telugu", "kn": "Kannada", "bn": "Bengali", "ml": "Malayalam", "pa": "Punjabi",
}
BUILTIN = ("en", "hi", "mr")

T: dict[str, dict[str, str]] = {
    "greet": {
        "en": "Namaste! I'm Vyapar Saathi from Accel Business. In about 3 questions I'll suggest the right internet, phone and digital setup for your business — with one clear monthly price.\n\nTell me about your business: what do you do, and in which city? If you have a GSTIN, just type it and I'll fill in the details myself.",
        "hi": "नमस्ते! मैं Accel Business का व्यापार साथी हूँ। सिर्फ़ 3 सवालों में मैं आपके बिज़नेस के लिए सही इंटरनेट, फ़ोन और डिजिटल सेटअप बताऊँगा — एक साफ़ मासिक कीमत के साथ।\n\nअपने बिज़नेस के बारे में बताइए: आप क्या करते हैं और किस शहर में? अगर आपके पास GSTIN है तो बस वो लिख दीजिए, बाकी जानकारी मैं ख़ुद भर दूँगा।",
        "mr": "नमस्कार! मी Accel Business चा व्यापार साथी. फक्त 3 प्रश्नांत मी तुमच्या व्यवसायासाठी योग्य इंटरनेट, फोन आणि डिजिटल सेटअप सुचवेन — एका स्पष्ट मासिक किमतीसह.\n\nतुमच्या व्यवसायाबद्दल सांगा: तुम्ही काय करता आणि कोणत्या शहरात? तुमच्याकडे GSTIN असेल तर फक्त तो टाइप करा, बाकी माहिती मी स्वतः भरतो.",
    },
    "gst_found": {
        "en": "Found you in the GST registry: **{name}** ({constitution}), {city}. GST status: {status}. I've filled these in for you.",
        "hi": "GST रजिस्ट्री में आपका बिज़नेस मिल गया: **{name}** ({constitution}), {city}. GST स्टेटस: {status}. ये जानकारी मैंने भर दी है।",
        "mr": "GST नोंदणीत तुमचा व्यवसाय सापडला: **{name}** ({constitution}), {city}. GST स्थिती: {status}. ही माहिती मी भरली आहे.",
    },
    "gst_inactive": {
        "en": "Heads-up: your GSTIN is **{status}**. You can still get internet, mobile, CCTV and most services today. A few products (like WhatsApp Business API and SMS) need an active GSTIN — I'll show them as \"unlock later\".",
        "hi": "ध्यान दें: आपका GSTIN **{status}** है। इंटरनेट, मोबाइल, CCTV और ज़्यादातर सेवाएँ आप आज ही ले सकते हैं। कुछ प्रोडक्ट (जैसे WhatsApp Business API और SMS) के लिए चालू GSTIN ज़रूरी है — उन्हें मैं \"बाद में अनलॉक\" के रूप में दिखाऊँगा।",
        "mr": "लक्ष द्या: तुमचा GSTIN **{status}** आहे. इंटरनेट, मोबाइल, CCTV आणि बहुतेक सेवा आजच घेता येतील. काही उत्पादनांसाठी (उदा. WhatsApp Business API, SMS) सक्रिय GSTIN लागतो — ती मी \"नंतर अनलॉक\" म्हणून दाखवेन.",
    },
    "gst_invalid": {
        "en": "That GSTIN doesn't look right ({reason}). Could you check it? Or just tell me about your business instead.",
        "hi": "यह GSTIN सही नहीं लग रहा ({reason})। एक बार जाँच लेंगे? या सीधे अपने बिज़नेस के बारे में बता दीजिए।",
        "mr": "हा GSTIN बरोबर वाटत नाही ({reason}). एकदा तपासाल का? किंवा थेट तुमच्या व्यवसायाबद्दल सांगा.",
    },
    "ask_identity": {
        "en": "What kind of business is it, and in which city?",
        "hi": "आपका बिज़नेस किस तरह का है, और किस शहर में है?",
        "mr": "तुमचा व्यवसाय कोणत्या प्रकारचा आहे आणि कोणत्या शहरात?",
    },
    "ask_city": {
        "en": "Which city is the business in?",
        "hi": "बिज़नेस किस शहर में है?",
        "mr": "व्यवसाय कोणत्या शहरात आहे?",
    },
    "ask_scale": {
        "en": "Got it — a {btype} in {city}. How many people work there, and how many locations do you have? And what internet do you use today (roughly how much do you pay a month)?",
        "hi": "समझ गया — {city} में {btype}। वहाँ कितने लोग काम करते हैं और कितनी जगह/ब्रांच हैं? और अभी कौन सा इंटरनेट इस्तेमाल करते हैं (महीने का लगभग कितना ख़र्च)?",
        "mr": "समजलं — {city} मधील {btype}. तिथे किती लोक काम करतात आणि किती ठिकाणी शाखा आहेत? आणि सध्या कोणतं इंटरनेट वापरता (महिन्याला साधारण किती खर्च)?",
    },
    "ask_needs": {
        "en": "Last question: what matters most to you? Pick any, or tell me in your own words.",
        "hi": "आख़िरी सवाल: आपके लिए सबसे ज़रूरी क्या है? कोई भी चुनिए, या अपने शब्दों में बताइए।",
        "mr": "शेवटचा प्रश्न: तुमच्यासाठी सर्वात महत्त्वाचं काय आहे? कोणतंही निवडा किंवा तुमच्या शब्दांत सांगा.",
    },
    "need_added": {
        "en": "Added: {label} ✓ — pick more, or tap \"Show my bundle\".",
        "hi": "जोड़ दिया: {label} ✓ — और चुनिए, या \"मेरा बंडल दिखाइए\" दबाइए।",
        "mr": "जोडलं: {label} ✓ — आणखी निवडा, किंवा \"माझं बंडल दाखवा\" दाबा.",
    },
    "assume_scale": {
        "en": "(I've assumed {employees} people and {sites} location — change it any time.)",
        "hi": "(मैंने {employees} लोग और {sites} जगह मान ली है — कभी भी बदल सकते हैं।)",
        "mr": "(मी {employees} लोक आणि {sites} ठिकाण गृहीत धरलं आहे — कधीही बदलू शकता.)",
    },
    "recommend_intro": {
        "en": "Here's what I recommend for your {btype}: **{bundle}** at **₹{monthly}/month** + GST, everything on one bill with one support number. Fully live in about {days} days.",
        "hi": "आपके {btype} के लिए मेरा सुझाव: **{bundle}** — **₹{monthly}/महीना** + GST, सब कुछ एक ही बिल और एक ही सपोर्ट नंबर पर। लगभग {days} दिनों में पूरी तरह चालू।",
        "mr": "तुमच्या {btype} साठी माझी शिफारस: **{bundle}** — **₹{monthly}/महिना** + GST, सर्व काही एकाच बिलावर आणि एकाच सपोर्ट नंबरवर. साधारण {days} दिवसांत पूर्ण सुरू.",
    },
    "savings": {
        "en": "Today you spend about ₹{current}/month on telecom. The connectivity part of this bundle is ₹{connectivity}/month — and you get everything else on the same bill.",
        "hi": "अभी आप टेलीकॉम पर लगभग ₹{current}/महीना ख़र्च करते हैं। इस बंडल में इंटरनेट-फ़ोन का हिस्सा ₹{connectivity}/महीना है — और बाकी सब भी उसी बिल में।",
        "mr": "सध्या तुम्ही टेलिकॉमवर साधारण ₹{current}/महिना खर्च करता. या बंडलमधील कनेक्टिव्हिटीचा भाग ₹{connectivity}/महिना आहे — आणि बाकी सर्व त्याच बिलात.",
    },
    "blocked_note": {
        "en": "Not included right now: {items}. {why}",
        "hi": "अभी शामिल नहीं: {items}. {why}",
        "mr": "सध्या समाविष्ट नाही: {items}. {why}",
    },
    "next_steps": {
        "en": "You can switch add-ons on/off and see the price change live. When you're happy, tap **Continue** — verification takes about 2 minutes.",
        "hi": "आप ऐड-ऑन चालू/बंद करके कीमत तुरंत बदलती देख सकते हैं। ठीक लगे तो **आगे बढ़ें** दबाइए — वेरिफ़िकेशन में लगभग 2 मिनट लगते हैं।",
        "mr": "ऍड-ऑन चालू/बंद करून किंमत लगेच बदलताना पाहू शकता. पटलं की **पुढे जा** दाबा — पडताळणीला साधारण 2 मिनिटं लागतात.",
    },
    "objection_price": {
        "en": "Understood — let's keep it lean. The **Essential** bundle is ₹{essential}/month. And if you choose a 24-month plan, the price drops to ₹{essential24}/month with 50% off setup.",
        "hi": "समझ गया — इसे हल्का रखते हैं। **Essential** बंडल ₹{essential}/महीना है। और 24 महीने का प्लान लें तो कीमत ₹{essential24}/महीना हो जाती है, साथ में सेटअप पर 50% छूट।",
        "mr": "समजलं — हलकं ठेवूया. **Essential** बंडल ₹{essential}/महिना आहे. आणि 24 महिन्यांचा प्लॅन घेतल्यास किंमत ₹{essential24}/महिना होते, सेटअपवर 50% सूट.",
    },
    "objection_locked": {
        "en": "No problem. Tell me roughly when your current contract ends and I'll remind you a month before — with this exact quote locked for you. Meanwhile, you can still add services your current provider doesn't give you (like CCTV or WhatsApp).",
        "hi": "कोई बात नहीं। बताइए आपका मौजूदा कॉन्ट्रैक्ट लगभग कब ख़त्म होगा — मैं एक महीना पहले याद दिला दूँगा, यही कोटेशन आपके लिए सुरक्षित रहेगा। तब तक आप वो सेवाएँ ले सकते हैं जो अभी के प्रोवाइडर नहीं देते (जैसे CCTV या WhatsApp)।",
        "mr": "हरकत नाही. तुमचा सध्याचा करार साधारण कधी संपतो ते सांगा — मी एक महिना आधी आठवण करून देईन, हेच कोटेशन तुमच्यासाठी राखून ठेवलं जाईल.",
    },
    "objection_mobile": {
        "en": "Sure — here's just the mobile line: Business Postpaid 299 (50 GB, unlimited calls). You can add internet or anything else later with one tap.",
        "hi": "ज़रूर — सिर्फ़ मोबाइल लाइन: Business Postpaid 299 (50 GB, अनलिमिटेड कॉल)। इंटरनेट या कुछ और बाद में एक टैप में जोड़ सकते हैं।",
        "mr": "नक्की — फक्त मोबाइल लाइन: Business Postpaid 299 (50 GB, अमर्यादित कॉल). इंटरनेट किंवा इतर काही नंतर एका टॅपमध्ये जोडता येईल.",
    },
    "later": {
        "en": "No rush. I've saved everything — I'll send a link on WhatsApp so you can continue exactly where you left off. This quote is valid till {valid}.",
        "hi": "कोई जल्दी नहीं। मैंने सब सेव कर लिया है — WhatsApp पर एक लिंक भेज रहा हूँ, जहाँ छोड़ा था वहीं से आगे बढ़ सकेंगे। यह कोटेशन {valid} तक मान्य है।",
        "mr": "घाई नाही. मी सर्व सेव्ह केलं आहे — WhatsApp वर लिंक पाठवतो, जिथे थांबलात तिथूनच पुढे जाता येईल. हे कोटेशन {valid} पर्यंत वैध आहे.",
    },
    "handoff": {
        "en": "I've passed your details to {who} with a summary of our chat, so you won't have to repeat yourself. They'll call you within {sla}. You can keep exploring here meanwhile.",
        "hi": "मैंने आपकी जानकारी बातचीत के सार के साथ {who} को भेज दी है, ताकि आपको दोबारा कुछ बताना न पड़े। वे {sla} में कॉल करेंगे। तब तक आप यहाँ देखते रहिए।",
        "mr": "मी तुमची माहिती आपल्या संभाषणाच्या सारांशासह {who} यांना पाठवली आहे, म्हणजे पुन्हा सांगावं लागणार नाही. ते {sla} मध्ये कॉल करतील.",
    },
    "handoff_big": {
        "en": "For a setup of your size ({employees} people, {sites} locations) a solutions expert can design a better plan — including site surveys. I've shown an indicative bundle below.",
        "hi": "आपके आकार ({employees} लोग, {sites} जगह) के सेटअप के लिए हमारे एक्सपर्ट साइट सर्वे के साथ बेहतर प्लान बना सकते हैं। नीचे एक अनुमानित बंडल दिखाया है।",
        "mr": "तुमच्या आकाराच्या ({employees} लोक, {sites} ठिकाणे) सेटअपसाठी आमचे तज्ज्ञ साइट सर्वेसह अधिक चांगला प्लॅन बनवू शकतात. खाली अंदाजित बंडल दाखवलं आहे.",
    },
    "not_understood": {
        "en": "Sorry, I didn't quite get that. Could you tell me what your business does and where? For example: \"Dental clinic in Pune, 8 staff\".",
        "hi": "माफ़ कीजिए, मैं ठीक से समझ नहीं पाया। बताइए आपका बिज़नेस क्या है और कहाँ है? जैसे: \"पुणे में डेंटल क्लिनिक, 8 लोग\"।",
        "mr": "माफ करा, मला नीट समजलं नाही. तुमचा व्यवसाय काय आहे आणि कुठे ते सांगाल? उदा.: \"पुण्यात डेंटल क्लिनिक, 8 लोक\".",
    },
    "faq_none": {
        "en": "I can help with Accel Business internet, mobile, cloud, security and CCTV products, prices and your order. Could you rephrase that?",
        "hi": "मैं Accel Business के इंटरनेट, मोबाइल, क्लाउड, सिक्योरिटी और CCTV प्रोडक्ट, कीमतें और आपके ऑर्डर में मदद कर सकता हूँ। क्या आप दूसरे शब्दों में पूछेंगे?",
        "mr": "मी Accel Business चे इंटरनेट, मोबाइल, क्लाउड, सुरक्षा आणि CCTV उत्पादने, किमती आणि तुमच्या ऑर्डरबद्दल मदत करू शकतो. दुसऱ्या शब्दांत विचाराल का?",
    },
    "no_fibre": {
        "en": "Fibre isn't available at pincode {pincode} yet, so I've switched you to **5G AirFiber** — plug-and-play, installed in about 2 days.",
        "hi": "पिनकोड {pincode} पर अभी फ़ाइबर उपलब्ध नहीं है, इसलिए मैंने **5G AirFiber** चुना है — प्लग-एंड-प्ले, लगभग 2 दिन में इंस्टॉल।",
        "mr": "पिनकोड {pincode} वर अजून फायबर उपलब्ध नाही, म्हणून मी **5G AirFiber** निवडलं आहे — प्लग-अँड-प्ले, साधारण 2 दिवसांत इन्स्टॉल.",
    },
}

NEED_LABELS: dict[str, dict[str, str]] = {
    "payments": {"en": "UPI & billing never stop", "hi": "UPI और बिलिंग कभी न रुके", "mr": "UPI व बिलिंग कधीही थांबू नये"},
    "whatsapp": {"en": "Customers on WhatsApp", "hi": "WhatsApp पर ग्राहक", "mr": "WhatsApp वर ग्राहक"},
    "cctv": {"en": "CCTV on my phone", "hi": "फ़ोन पर CCTV", "mr": "फोनवर CCTV"},
    "cloud_email": {"en": "Business email", "hi": "बिज़नेस ईमेल", "mr": "व्यवसाय ईमेल"},
    "backup": {"en": "Data backup", "hi": "डेटा बैकअप", "mr": "डेटा बॅकअप"},
    "security": {"en": "Virus protection", "hi": "वायरस से सुरक्षा", "mr": "व्हायरसपासून संरक्षण"},
    "website": {"en": "Website", "hi": "वेबसाइट", "mr": "वेबसाइट"},
    "failover": {"en": "Internet never goes down", "hi": "इंटरनेट कभी बंद न हो", "mr": "इंटरनेट कधीही बंद होऊ नये"},
    "guest_wifi": {"en": "Wi-Fi for customers", "hi": "ग्राहकों के लिए Wi-Fi", "mr": "ग्राहकांसाठी Wi-Fi"},
    "telephony": {"en": "Business phone lines / IVR", "hi": "बिज़नेस फ़ोन लाइन / IVR", "mr": "व्यवसाय फोन लाइन / IVR"},
    "sms": {"en": "SMS reminders", "hi": "SMS रिमाइंडर", "mr": "SMS स्मरणपत्रे"},
    "machines": {"en": "Machine monitoring", "hi": "मशीन मॉनिटरिंग", "mr": "मशीन देखरेख"},
    "fleet": {"en": "Vehicle tracking", "hi": "गाड़ी ट्रैकिंग", "mr": "वाहन ट्रॅकिंग"},
    "remote_access": {"en": "Remote access / static IP", "hi": "रिमोट एक्सेस / स्टैटिक IP", "mr": "रिमोट ऍक्सेस / स्टॅटिक IP"},
    "fast_internet": {"en": "Fast internet", "hi": "तेज़ इंटरनेट", "mr": "वेगवान इंटरनेट"},
    "mobile": {"en": "Mobile lines for staff", "hi": "स्टाफ़ के लिए मोबाइल लाइन", "mr": "कर्मचाऱ्यांसाठी मोबाइल लाइन"},
    "tollfree": {"en": "Toll-free number", "hi": "टोल-फ़्री नंबर", "mr": "टोल-फ्री नंबर"},
    "central_mgmt": {"en": "Manage all branches centrally", "hi": "सभी ब्रांच एक जगह से", "mr": "सर्व शाखा एका ठिकाणाहून"},
}

# One plain-language benefit per product ("why it's in your bundle").
BENEFIT: dict[str, dict[str, str]] = {
    "P01": {"en": "100 Mbps fibre for UPI, billing and everyday work — unlimited data.", "hi": "UPI, बिलिंग और रोज़ के काम के लिए 100 Mbps फ़ाइबर — अनलिमिटेड डेटा।", "mr": "UPI, बिलिंग आणि रोजच्या कामासाठी 100 Mbps फायबर — अमर्यादित डेटा."},
    "P02": {"en": "300 Mbps fibre so the whole team can work, video-call and upload at the same time.", "hi": "300 Mbps फ़ाइबर — पूरी टीम एक साथ काम, वीडियो कॉल और अपलोड कर सके।", "mr": "300 Mbps फायबर — संपूर्ण टीम एकाच वेळी काम, व्हिडिओ कॉल आणि अपलोड करू शकते."},
    "P03": {"en": "1 Gbps fibre with priority support for heavy files, imaging and many users.", "hi": "भारी फ़ाइलों, इमेजिंग और कई यूज़र्स के लिए 1 Gbps फ़ाइबर, प्रायोरिटी सपोर्ट के साथ।", "mr": "मोठ्या फाइल्स, इमेजिंग आणि अनेक वापरकर्त्यांसाठी 1 Gbps फायबर, प्राधान्य सपोर्टसह."},
    "P04": {"en": "5G wireless broadband — no digging, plug in and go, installed in ~2 days.", "hi": "5G वायरलेस ब्रॉडबैंड — कोई खुदाई नहीं, प्लग करें और चलाएँ, ~2 दिन में चालू।", "mr": "5G वायरलेस ब्रॉडबँड — खोदकाम नाही, प्लग करा आणि सुरू करा, ~2 दिवसांत."},
    "P05": {"en": "Dedicated 20 Mbps line with 99.5% uptime SLA — not shared with anyone.", "hi": "डेडिकेटेड 20 Mbps लाइन, 99.5% अपटाइम की गारंटी — किसी के साथ शेयर नहीं।", "mr": "समर्पित 20 Mbps लाइन, 99.5% अपटाइम हमी — कोणासोबत शेअर नाही."},
    "P06": {"en": "Dedicated 100 Mbps line with 99.9% SLA for ERP and machines that can't stop.", "hi": "ERP और कभी न रुकने वाली मशीनों के लिए 99.9% SLA वाली डेडिकेटेड 100 Mbps लाइन।", "mr": "ERP आणि न थांबणाऱ्या मशीनसाठी 99.9% SLA ची समर्पित 100 Mbps लाइन."},
    "P07": {"en": "Business mobile line with 50 GB data and unlimited calls.", "hi": "50 GB डेटा और अनलिमिटेड कॉल वाली बिज़नेस मोबाइल लाइन।", "mr": "50 GB डेटा आणि अमर्यादित कॉलसह व्यवसाय मोबाइल लाइन."},
    "P08": {"en": "Business mobile line with 150 GB, roaming and priority care for your team.", "hi": "आपकी टीम के लिए 150 GB, रोमिंग और प्रायोरिटी केयर वाली मोबाइल लाइन।", "mr": "तुमच्या टीमसाठी 150 GB, रोमिंग आणि प्राधान्य सेवा असलेली मोबाइल लाइन."},
    "P09": {"en": "If the main line goes down, a 4G/5G backup takes over automatically — payments never stop.", "hi": "मुख्य लाइन बंद हो जाए तो 4G/5G बैकअप अपने आप चालू — पेमेंट कभी नहीं रुकेंगे।", "mr": "मुख्य लाइन बंद पडली तर 4G/5G बॅकअप आपोआप सुरू — पेमेंट कधीही थांबणार नाहीत."},
    "P10": {"en": "Manage every branch's internet from one screen, with priority for billing apps.", "hi": "हर ब्रांच का इंटरनेट एक स्क्रीन से संभालें, बिलिंग ऐप्स को प्राथमिकता के साथ।", "mr": "प्रत्येक शाखेचं इंटरनेट एका स्क्रीनवरून सांभाळा, बिलिंग ऍप्सना प्राधान्य."},
    "P11": {"en": "A fixed IP so you can view cameras or reach your office system remotely.", "hi": "फ़िक्स्ड IP — कैमरे देखने या ऑफ़िस सिस्टम तक दूर से पहुँचने के लिए।", "mr": "स्थिर IP — कॅमेरे पाहण्यासाठी किंवा ऑफिस सिस्टमला दूरून जोडण्यासाठी."},
    "P12": {"en": "Business phone lines over the internet with IVR and call recording.", "hi": "IVR और कॉल रिकॉर्डिंग के साथ इंटरनेट पर बिज़नेस फ़ोन लाइनें।", "mr": "IVR आणि कॉल रेकॉर्डिंगसह इंटरनेटवर व्यवसाय फोन लाइन्स."},
    "P13": {"en": "An 1800 toll-free number customers can call for free.", "hi": "1800 टोल-फ़्री नंबर, जिस पर ग्राहक मुफ़्त कॉल कर सकें।", "mr": "1800 टोल-फ्री नंबर, ज्यावर ग्राहक मोफत कॉल करू शकतात."},
    "P14": {"en": "10,000 SMS a month for reminders and offers (DLT registration done for you).", "hi": "रिमाइंडर और ऑफ़र के लिए महीने में 10,000 SMS (DLT रजिस्ट्रेशन हम करेंगे)।", "mr": "स्मरणपत्रे व ऑफरसाठी महिन्याला 10,000 SMS (DLT नोंदणी आम्ही करू)."},
    "P15": {"en": "Verified WhatsApp with your catalogue — customers order and get updates on WhatsApp.", "hi": "वेरिफ़ाइड WhatsApp और कैटलॉग — ग्राहक WhatsApp पर ऑर्डर करें और अपडेट पाएँ।", "mr": "व्हेरिफाइड WhatsApp आणि कॅटलॉग — ग्राहक WhatsApp वर ऑर्डर करतात आणि अपडेट मिळवतात."},
    "P16": {"en": "Email on your own domain, shared documents and video meetings for each user.", "hi": "हर यूज़र के लिए अपने डोमेन पर ईमेल, शेयर्ड डॉक्यूमेंट और वीडियो मीटिंग।", "mr": "प्रत्येक वापरकर्त्यासाठी स्वतःच्या डोमेनवर ईमेल, शेअर्ड डॉक्युमेंट्स आणि व्हिडिओ मीटिंग."},
    "P17": {"en": "Automatic 1 TB backup — records stay safe even if a PC crashes.", "hi": "ऑटोमैटिक 1 TB बैकअप — PC ख़राब हो जाए तब भी रिकॉर्ड सुरक्षित।", "mr": "ऑटोमॅटिक 1 TB बॅकअप — PC बिघडला तरी नोंदी सुरक्षित."},
    "P18": {"en": "Your own website and domain so customers find you on Google.", "hi": "आपकी अपनी वेबसाइट और डोमेन, ताकि ग्राहक Google पर आपको ढूँढ सकें।", "mr": "तुमची स्वतःची वेबसाइट आणि डोमेन, म्हणजे ग्राहक Google वर तुम्हाला शोधू शकतील."},
    "P19": {"en": "GST-ready billing, stock and UPI/card payments on one tablet.", "hi": "GST-रेडी बिलिंग, स्टॉक और UPI/कार्ड पेमेंट — एक ही टैबलेट पर।", "mr": "GST-तयार बिलिंग, स्टॉक आणि UPI/कार्ड पेमेंट — एकाच टॅबलेटवर."},
    "P20": {"en": "Antivirus and ransomware protection for every PC and phone.", "hi": "हर PC और फ़ोन के लिए एंटीवायरस और रैनसमवेयर सुरक्षा।", "mr": "प्रत्येक PC आणि फोनसाठी अँटीव्हायरस व रॅन्समवेअर संरक्षण."},
    "P21": {"en": "A managed firewall watched by Accel's security team 24x7.", "hi": "Accel की सिक्योरिटी टीम द्वारा 24x7 संभाला जाने वाला फ़ायरवॉल।", "mr": "Accel च्या सुरक्षा टीमकडून 24x7 सांभाळलेला फायरवॉल."},
    "P22": {"en": "Separate Wi-Fi for customers, so your billing network stays private and safe.", "hi": "ग्राहकों के लिए अलग Wi-Fi, ताकि आपका बिलिंग नेटवर्क सुरक्षित रहे।", "mr": "ग्राहकांसाठी वेगळं Wi-Fi, म्हणजे तुमचं बिलिंग नेटवर्क सुरक्षित राहील."},
    "P23": {"en": "HD cameras with 30-day cloud recording — watch your shop live on your phone.", "hi": "30 दिन क्लाउड रिकॉर्डिंग वाले HD कैमरे — अपनी दुकान फ़ोन पर लाइव देखें।", "mr": "30 दिवस क्लाउड रेकॉर्डिंगसह HD कॅमेरे — तुमचं दुकान फोनवर लाइव्ह पाहा."},
    "P24": {"en": "Sensors on machines to track uptime and electricity use from your phone.", "hi": "मशीनों पर सेंसर — अपटाइम और बिजली की खपत फ़ोन पर देखें।", "mr": "मशीनवर सेन्सर — अपटाइम आणि वीज वापर फोनवर पाहा."},
    "P25": {"en": "Live GPS tracking of your delivery vehicles.", "hi": "आपकी डिलीवरी गाड़ियों की लाइव GPS ट्रैकिंग।", "mr": "तुमच्या डिलिव्हरी वाहनांचं लाइव्ह GPS ट्रॅकिंग."},
}

REASON_TEXT: dict[str, dict[str, str]] = {
    "need": {"en": "You asked for: {label}", "hi": "आपने माँगा: {label}", "mr": "तुम्ही मागितलं: {label}"},
    "segment": {"en": "Most businesses like yours start with this", "hi": "आप जैसे ज़्यादातर बिज़नेस इसी से शुरू करते हैं", "mr": "तुमच्यासारखे बहुतेक व्यवसाय यानेच सुरुवात करतात"},
    "size": {"en": "Sized for your team and locations", "hi": "आपकी टीम और जगहों के हिसाब से", "mr": "तुमच्या टीम आणि ठिकाणांनुसार"},
    "type": {"en": "Useful for your kind of business", "hi": "आपके तरह के बिज़नेस के लिए उपयोगी", "mr": "तुमच्या प्रकारच्या व्यवसायासाठी उपयुक्त"},
    "tier": {"en": "Extra peace of mind in the Pro bundle", "hi": "Pro बंडल में अतिरिक्त सुरक्षा", "mr": "Pro बंडलमध्ये अतिरिक्त निश्चिंतता"},
    "feasibility": {"en": "Fibre isn't available at your site", "hi": "आपकी जगह फ़ाइबर उपलब्ध नहीं है", "mr": "तुमच्या ठिकाणी फायबर उपलब्ध नाही"},
    "dependency": {"en": "Needed for another product in your bundle", "hi": "आपके बंडल के दूसरे प्रोडक्ट के लिए ज़रूरी", "mr": "तुमच्या बंडलमधील दुसऱ्या उत्पादनासाठी आवश्यक"},
}

BUNDLE_NAMES = {
    "essential": {"en": "Essential", "hi": "Essential", "mr": "Essential"},
    "recommended": {"en": "Recommended", "hi": "Recommended", "mr": "Recommended"},
    "pro": {"en": "Pro", "hi": "Pro", "mr": "Pro"},
}

BTYPE_HI = {
    "Dental clinic": "डेंटल क्लिनिक", "Clinic": "क्लिनिक", "Kirana store": "किराना स्टोर", "Pharmacy": "फ़ार्मेसी",
    "Salon": "सैलून", "Bakery": "बेकरी", "Restaurant": "रेस्टोरेंट", "CA firm": "CA फ़र्म", "Coaching centre": "कोचिंग सेंटर",
    "Restaurant chain": "रेस्टोरेंट चेन", "Textile unit": "टेक्सटाइल यूनिट", "Manufacturing unit": "मैन्युफ़ैक्चरिंग यूनिट",
}


def lang_or_default(lang: str) -> str:
    return lang if lang in BUILTIN else "en"


def t(key: str, lang: str, **kw) -> str:
    table = T[key]
    text = table.get(lang) or table["en"]
    return text.format(**kw) if kw else text


def benefit(pid: str, lang: str) -> str:
    return BENEFIT.get(pid, {}).get(lang) or BENEFIT.get(pid, {}).get("en", "")


def need_label(need: str, lang: str) -> str:
    return NEED_LABELS.get(need, {}).get(lang) or NEED_LABELS.get(need, {}).get("en", need)


def reason_text(code: str, lang: str) -> str:
    kind, _, val = code.partition(":")
    tmpl = REASON_TEXT.get(kind, REASON_TEXT["segment"])
    text = tmpl.get(lang) or tmpl["en"]
    return text.format(label=need_label(val, lang)) if "{label}" in text else text


def btype_label(btype: str | None, lang: str) -> str:
    if not btype:
        return {"hi": "बिज़नेस", "mr": "व्यवसाय"}.get(lang, "business")
    if lang in ("hi", "mr"):
        return BTYPE_HI.get(btype, btype)
    return btype.lower() if btype[0].isupper() and btype not in ("CA firm",) else btype
