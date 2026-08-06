from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, random

W, H = 1200, 630
BG    = (6, 7, 10)
PINK  = (230, 0, 122)
WHITE = (255, 255, 255)
GREY  = (124, 133, 148)
MUTED = (150, 158, 172)
UP    = (38, 166, 154)
DOWN  = (239, 83, 80)

F = "/usr/share/fonts/truetype/liberation/"
bold = lambda s: ImageFont.truetype(F + "LiberationSans-Bold.ttf", s)
reg  = lambda s: ImageFont.truetype(F + "LiberationSans-Regular.ttf", s)
mono = lambda s: ImageFont.truetype(F + "LiberationMono-Bold.ttf", s)

# Layout budget: text owns the left, chart owns the right. Nothing crosses.
TEXT_L, TEXT_R = 72, 620
CH_L, CH_R, CH_T, CH_B = 672, 1128, 168, 512

img = Image.new("RGB", (W, H), BG)

glow = Image.new("RGB", (W, H), BG)
gd = ImageDraw.Draw(glow)
gd.ellipse([W-620, H-520, W+240, H+240], fill=(64, 0, 36))
gd.ellipse([W-380, H-300, W+140, H+160], fill=(112, 0, 60))
glow = glow.filter(ImageFilter.GaussianBlur(160))
img = Image.blend(img, glow, 0.8)
d = ImageDraw.Draw(img)

for x in range(0, W, 48): d.line([(x,0),(x,H)], fill=(15,17,23))
for y in range(0, H, 48): d.line([(0,y),(W,y)], fill=(15,17,23))

# ── candles: UP trend, clamped inside the chart box ─────────────────────
random.seed(7)
N = 18
series, price = [], 100.0
for i in range(N):
    o = price
    c = o + random.uniform(-9, 15) + 4.2          # net upward drift
    hi, lo = max(o, c) + random.uniform(2, 9), min(o, c) - random.uniform(2, 9)
    series.append((o, c, hi, lo)); price = c

lo_v = min(s[3] for s in series); hi_v = max(s[2] for s in series)
span = hi_v - lo_v
ym = lambda v: CH_B - (v - lo_v) / span * (CH_B - CH_T)
step = (CH_R - CH_L - 150) / N          # leave 150px for the depth ladder
cw = int(step * 0.56)

closes = []
for i, (o, c, hi, lo) in enumerate(series):
    x = CH_L + i * step
    col = UP if c >= o else DOWN
    d.line([(x + cw/2, ym(hi)), (x + cw/2, ym(lo))], fill=col, width=2)
    y0, y1 = sorted((ym(o), ym(c)))
    d.rounded_rectangle([x, y0, x + cw, max(y1, y0 + 3)], radius=2, fill=col)
    closes.append((x + cw/2, ym(c)))
d.line(closes, fill=(90, 100, 118), width=2, joint="curve")

# ── depth ladder: right of the candles, inside the box ──────────────────
LD_R, LD_W = CH_R, 120
for i in range(7):                       # asks above mid
    y = CH_T + 6 + i * 13
    w = int(LD_W * (0.30 + 0.70 * i / 6))
    d.rectangle([LD_R - w, y, LD_R, y + 7], fill=(30, 92, 88))
d.line([(LD_R - LD_W, CH_T + 104), (LD_R, CH_T + 104)], fill=(60, 66, 78))
for i in range(7):                       # bids below mid
    y = CH_T + 114 + i * 13
    w = int(LD_W * (0.95 - 0.62 * i / 6))
    d.rectangle([LD_R - w, y, LD_R, y + 7], fill=(120, 46, 46))

# ── logo ────────────────────────────────────────────────────────────────
def mark(cx, cy, s):
    for a, col in ((45, WHITE), (-45, PINK)):
        bar = Image.new("RGBA", (s*2, s*2), (0,0,0,0))
        ImageDraw.Draw(bar).rounded_rectangle(
            [s-s*0.17, s-s*0.78, s+s*0.17, s+s*0.78], radius=s*0.17, fill=col+(255,))
        r = bar.rotate(a, resample=Image.BICUBIC)
        img.paste(r, (int(cx-s), int(cy-s)), r)
mark(78, 74, 26)
d.text((116, 56), "Orderbook", font=bold(30), fill=WHITE)
d.text((116 + d.textlength("Orderbook", font=bold(30)), 56), ".", font=bold(30), fill=PINK)

# ── badge ───────────────────────────────────────────────────────────────
bx, by = TEXT_L, 190
tw = d.textlength("TESTNET", font=bold(19))
d.rounded_rectangle([bx, by, bx+tw+40, by+42], radius=21, fill=(48,0,27), outline=PINK, width=2)
d.text((bx+20, by+11), "TESTNET", font=bold(19), fill=PINK)

# ── headline (measured so it cannot reach the chart) ────────────────────
d.text((TEXT_L, 258), "Trade on Polkadex.", font=bold(62), fill=WHITE)
d.text((TEXT_L, 330), "No account.",        font=bold(62), fill=GREY)
d.text((TEXT_L, 402), "No custody.",        font=bold(62), fill=GREY)

d.text((TEXT_L, 496), "Orderbook DEX · free testnet tokens", font=reg(25), fill=MUTED)

d.line([(TEXT_L, 566), (TEXT_L+38, 566)], fill=PINK, width=3)
d.text((TEXT_L+52, 552), "testnet.polkadex.ee", font=mono(27), fill=WHITE)

# collision guard: widest headline must stay left of the chart
widest = max(d.textlength(t, font=bold(62)) for t in
             ("Trade on Polkadex.", "No account.", "No custody."))
assert TEXT_L + widest < CH_L - 20, f"text overruns chart: {TEXT_L+widest:.0f} >= {CH_L-20}"

img.save("/tmp/og/og-image.png", "PNG", optimize=True)
print(f"ok  text_right={TEXT_L+widest:.0f}  chart_left={CH_L}")
