"""Apply a light horizontal preview watermark to exported designs."""

from __future__ import annotations

from PIL import Image, ImageDraw, ImageFont


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    )
    if bold:
        candidates = (
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
            *candidates,
        )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def apply_watermark(
    src_path: str,
    dst_path: str,
    text: str = "MINT MY FACE",
) -> None:
    with Image.open(src_path) as img:
        base = img.convert("RGBA")
        w, h = base.size
        font_size = max(28, min(w, h) // 10)
        font = _load_font(font_size, bold=True)

        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        x = (w - tw) // 2
        y = (h - th) // 2

        # Soft professional wash — light, straight, centered
        draw.text((x, y), text, font=font, fill=(255, 255, 255, 68))

        out = Image.alpha_composite(base, overlay)
        out.convert("RGB").save(dst_path, format="PNG", optimize=True)
