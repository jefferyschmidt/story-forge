import os
import json
import re as _re
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from flask import Flask, request, Response, send_from_directory, jsonify

load_dotenv(Path(__file__).parent / '.env')

app = Flask(__name__, static_folder='public', static_url_path='')

client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

TEXT_MODEL   = 'gpt-4o'
CHAPTER_WORDS = 1800

WORD_TARGETS = {'short': 400, 'medium': 900, 'long': 1800}

GENRE_FLAVORS = {
    'fantasy':   'epic fantasy with magic, mythical creatures, and heroic quests',
    'scifi':     'science fiction with advanced technology, space exploration, or futuristic societies',
    'romance':   'romantic story with emotional tension, deep connection, and heartfelt moments',
    'mystery':   'mystery or thriller with clues, suspense, and a satisfying reveal',
    'horror':    'horror story with building dread, eerie atmosphere, and a shocking climax',
    'comedy':    'comedic story full of sharp humor, absurd situations, and witty banter',
    'adventure': 'action-packed adventure with danger, exploration, and hard-won triumph',
    'fairytale':  'enchanted fairy tale with wonder, magic, and a meaningful lesson',
    'christian':  'Christian romance centered on faith, hope, and love — wholesome, uplifting, and spiritually grounded, with heartfelt emotion and no explicit content',
}

TONE_FLAVORS = {
    'whimsical':    'light, playful, and whimsical — warm and imaginative',
    'dramatic':     'dramatic and emotionally charged, with high stakes and vivid character moments',
    'dark':         'dark and atmospheric, with a brooding edge and real consequences',
    'silly':        'gleefully silly and absurd — lean into comedy and chaos',
    'epic':         'grand and epic in scope — sweeping and heroic',
    'heartwarming': 'tender and uplifting, celebrating connection and the joy in small moments',
    'spicy':        'romantically charged and sensual — flirtatious, full of tension and longing, with intimacy that simmers and ignites',
}

POV_INSTRUCTIONS = {
    'third_limited': "Write in close third-person limited — stay inside one character's head.",
    'third_omni':    'Write in third-person omniscient — move freely between perspectives.',
    'first':         'Write in first-person from the protagonist\'s perspective — immediate and intimate.',
}

GENRE_ART_STYLES = {
    'fantasy':   'epic fantasy concept art, painterly illustration, magical atmosphere, rich jewel tones',
    'scifi':     'science fiction digital art, cinematic lighting, futuristic aesthetic, cool blues and silvers',
    'romance':   'soft romantic illustration, warm golden-hour light, impressionistic brushwork, intimate mood',
    'mystery':   'noir-style illustration, dramatic chiaroscuro shadows, moody atmosphere, amber accents',
    'horror':    'dark gothic illustration, eerie moonlight, deep shadows, unsettling atmosphere',
    'comedy':    'vibrant cartoon illustration, bright saturated colors, exaggerated expressions',
    'adventure': 'adventure concept art, wide cinematic landscape, warm dramatic lighting',
    'fairytale':  'watercolor storybook illustration, soft luminous pastels, whimsical atmosphere',
    'christian':  'soft romantic illustration, warm golden light, peaceful pastoral or small-town setting, uplifting and wholesome atmosphere',
}

_META_PATTERNS = [
    r"\nYou'?ve (done it|read to)",
    r"\nI hope you (found|enjoyed)",
    r"\nWould you like me to",
    r"\nFeel free to (replay|re-read|let me know)",
    r"\n\[(?:Hi there|I'?m afraid|Note:|Author)",
    r"\n\*(?:What do you think|How did I do|Note:)",
    r"\nHow did I do\?",
    r"\nLet me know (what|if)",
    r"\nWriting .{0,40}is new for me",
    r"\nThanks for the",
]

def strip_meta_commentary(text):
    for pattern in _META_PATTERNS:
        m = _re.search(pattern, text, _re.IGNORECASE)
        if m:
            text = text[:m.start()].rstrip()
    lines = []
    for line in text.split('\n'):
        if len(_re.findall(r'[^\x00-\x7FÀ-ɏ‘-‟…]', line)) < 4:
            lines.append(line)
    return '\n'.join(lines).strip()


def build_char_lines(characters):
    lines = []
    for c in characters:
        name = c.get('name', '').strip()
        if not name:
            continue
        role  = c.get('role', 'character')
        quirk = c.get('quirk', '').strip()
        desc  = c.get('description', '').strip()
        line  = f"- **{name}** ({role})"
        if quirk:
            line += f" — {quirk}"
        if desc:
            line += f". {desc}"
        lines.append(line)
    return lines


def build_prompt(data):
    genre       = data.get('genre', 'fantasy')
    tone        = data.get('tone', 'dramatic')
    length      = data.get('length', 'medium')
    pov         = data.get('pov', 'third_limited')
    characters  = data.get('characters', [])
    setting     = data.get('setting', '').strip()
    time_period = data.get('timePeriod', '').strip()
    plot_points = data.get('plotPoints', [])
    story_idea  = data.get('storyIdea', '').strip()
    audience    = data.get('audienceAge', 'adults')

    word_target = WORD_TARGETS.get(length, 900)
    genre_desc  = GENRE_FLAVORS.get(genre, genre)
    tone_desc   = TONE_FLAVORS.get(tone, tone)
    pov_instr   = POV_INSTRUCTIONS.get(pov, POV_INSTRUCTIONS['third_limited'])
    char_lines  = build_char_lines(characters)
    plot_lines  = [f"{i+1}. {p}" for i, p in enumerate(plot_points) if p.strip()]

    audience_note = {
        'kids':   'AUDIENCE: Children — keep it age-appropriate and gentle.',
        'teens':  'AUDIENCE: Teenagers — some tension fine, nothing graphic.',
        'adults': 'AUDIENCE: Adults.',
    }.get(audience, 'AUDIENCE: Adults.')

    prompt = f"""You are writing a {genre_desc}.
Tone: {tone_desc}
Point of view: {pov_instr}
Target length: approximately {word_target} words.
{audience_note}

Begin your response with a title on the very first line, formatted exactly like this:
<story-title>Your Title Here</story-title>

Then leave one blank line and begin the story."""

    if story_idea:
        prompt += f"\n\nCORE PREMISE:\n{story_idea}"
    if char_lines:
        prompt += "\n\nCHARACTERS:\n" + "\n".join(char_lines)
    if setting:
        prompt += f"\n\nSETTING: {setting}"
        if time_period:
            prompt += f" ({time_period})"
    elif time_period:
        prompt += f"\n\nTIME PERIOD: {time_period}"
    if plot_lines:
        prompt += "\n\nPLOT BEATS:\n" + "\n".join(plot_lines)

    prompt += """

CRAFT: Open with a hook. Show don't tell. End with resonance.
Write the title tag first, then the story. Nothing else before the title tag."""
    return prompt


def build_image_prompt(data):
    genre      = data.get('genre', 'fantasy')
    setting    = data.get('setting', '').strip()
    time_period = data.get('timePeriod', '').strip()
    story_idea  = data.get('storyIdea', '').strip()
    characters  = data.get('characters', [])

    art_style  = GENRE_ART_STYLES.get(genre, 'digital illustration, painterly style')
    char_roles = [f"{c['name']} the {c.get('role','character')}" for c in characters if c.get('name','').strip()]

    parts = []
    if story_idea:
        parts.append(story_idea[:140])
    if setting:
        parts.append(f"set in {setting}")
    if time_period:
        parts.append(time_period)
    if char_roles:
        parts.append(f"featuring {', '.join(char_roles[:2])}")

    scene = '. '.join(parts) if parts else f"a dramatic {genre} scene"
    return (f"{scene}. {art_style}. Wide cinematic composition, book cover quality. "
            "No text, no letters, no words anywhere in the image.")


# ── Short story ────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')


@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.get_json()
    if not data or not isinstance(data.get('characters'), list):
        return {'error': 'Invalid request'}, 400

    def stream():
        try:
            prompt = build_prompt(data)
            resp = client.chat.completions.create(
                model=TEXT_MODEL, max_tokens=4096, stream=True,
                messages=[
                    {'role': 'system', 'content': (
                        "You are an award-winning fiction writer. You craft vivid, emotionally resonant, "
                        "personalized stories. Every story feels made for exactly the person reading it."
                    )},
                    {'role': 'user', 'content': prompt},
                ],
            )
            full = []
            for chunk in resp:
                t = chunk.choices[0].delta.content
                if t:
                    full.append(t)
                    yield f"data: {json.dumps({'text': t})}\n\n"
            cleaned = strip_meta_commentary(''.join(full))
            if cleaned != ''.join(full):
                yield f"data: {json.dumps({'correction': cleaned})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(stream(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


@app.route('/api/illustrate', methods=['POST'])
def illustrate():
    data = request.get_json()
    if not data:
        return {'error': 'Invalid request'}, 400
    try:
        prompt = build_image_prompt(data)
        resp = client.images.generate(
            model='gpt-image-1', prompt=prompt,
            size='1536x1024', quality='low', n=1,
        )
        return {'url': f"data:image/png;base64,{resp.data[0].b64_json}"}
    except Exception as e:
        return {'error': str(e)}, 500


# ── Book mode ──────────────────────────────────────────────────────────────────

def build_book_system_prompt():
    return (
        "You are a skilled novelist. You write compelling, well-paced fiction with vivid characters, "
        "natural dialogue, and prose that keeps readers turning pages. You maintain perfect continuity "
        "across chapters — character names, details, and plot threads never contradict earlier text."
    )


@app.route('/api/book/start', methods=['POST'])
def book_start():
    """Generate the book title and chapter-by-chapter outline."""
    data = request.get_json()
    if not data:
        return {'error': 'Invalid request'}, 400

    genre      = data.get('genre', 'romance')
    tone       = data.get('tone', 'spicy')
    characters = data.get('characters', [])
    setting    = data.get('setting', '').strip()
    time_period = data.get('timePeriod', '').strip()
    story_idea  = data.get('storyIdea', '').strip()

    genre_desc = GENRE_FLAVORS.get(genre, genre)
    tone_desc  = TONE_FLAVORS.get(tone, tone)
    char_lines = build_char_lines(characters)

    prompt = f"""Plan a complete {genre_desc} novel with a {tone_desc} tone.

"""
    if story_idea:
        prompt += f"PREMISE: {story_idea}\n"
    if char_lines:
        prompt += "CHARACTERS:\n" + "\n".join(char_lines) + "\n"
    if setting:
        prompt += f"SETTING: {setting}"
        if time_period:
            prompt += f" ({time_period})"
        prompt += "\n"

    prompt += """
Create an 8-chapter outline with a compelling arc: setup, escalating tension, midpoint shift, dark moment, climax, and satisfying resolution.

Return ONLY valid JSON — no commentary, no markdown fences:
{
  "bookTitle": "The Full Book Title",
  "tagline": "A one-sentence hook for the book",
  "chapters": [
    {"number": 1, "title": "Chapter Title", "summary": "2-3 sentences describing what happens in this chapter."},
    ...
  ]
}"""

    try:
        resp = client.chat.completions.create(
            model=TEXT_MODEL,
            max_tokens=1200,
            response_format={"type": "json_object"},
            messages=[
                {'role': 'system', 'content': build_book_system_prompt()},
                {'role': 'user', 'content': prompt},
            ],
        )
        outline = json.loads(resp.choices[0].message.content)
        return jsonify(outline)
    except Exception as e:
        return {'error': str(e)}, 500


@app.route('/api/book/chapter', methods=['POST'])
def book_chapter():
    """Stream a single book chapter."""
    data = request.get_json()
    if not data:
        return {'error': 'Invalid request'}, 400

    genre          = data.get('genre', 'romance')
    tone           = data.get('tone', 'spicy')
    pov            = data.get('pov', 'third_limited')
    characters     = data.get('characters', [])
    outline        = data.get('outline', {})
    chapter_num    = data.get('chapterNum', 1)
    prev_chapters  = data.get('previousChapters', [])  # [{number, title, excerpt}]

    genre_desc = GENRE_FLAVORS.get(genre, genre)
    tone_desc  = TONE_FLAVORS.get(tone, tone)
    pov_instr  = POV_INSTRUCTIONS.get(pov, POV_INSTRUCTIONS['third_limited'])
    char_lines = build_char_lines(characters)

    book_title = outline.get('bookTitle', 'Untitled')
    chapters   = outline.get('chapters', [])
    this_ch    = next((c for c in chapters if c['number'] == chapter_num), {})
    ch_title   = this_ch.get('title', f'Chapter {chapter_num}')
    ch_summary = this_ch.get('summary', '')

    # Build context from previous chapters
    prev_context = ""
    if prev_chapters:
        prev_context = "\n\nSTORY SO FAR:\n"
        for pc in prev_chapters[-3:]:   # last 3 chapters for context
            prev_context += f"\nChapter {pc['number']} — {pc['title']}:\n{pc['excerpt']}\n"

    # Full outline for reference
    outline_text = "\n".join(
        f"  Ch {c['number']}: {c['title']} — {c['summary']}"
        for c in chapters
    )

    is_last = chapter_num == len(chapters)

    prompt = f"""You are writing Chapter {chapter_num} of "{book_title}", a {genre_desc} novel.
Tone: {tone_desc}
Point of view: {pov_instr}

FULL BOOK OUTLINE:
{outline_text}
{prev_context}

CHARACTERS:
{chr(10).join(char_lines) if char_lines else 'Use characters introduced in the outline.'}

NOW WRITE: Chapter {chapter_num} — {ch_title}
Chapter brief: {ch_summary}

Write approximately {CHAPTER_WORDS} words. Start directly with the chapter content — no "Chapter X" heading, just prose.
{"End the chapter with a satisfying conclusion — this is the final chapter." if is_last else "End at a natural pause that leaves the reader eager for the next chapter."}"""

    def stream():
        try:
            resp = client.chat.completions.create(
                model=TEXT_MODEL, max_tokens=2800, stream=True,
                messages=[
                    {'role': 'system', 'content': build_book_system_prompt()},
                    {'role': 'user', 'content': prompt},
                ],
            )
            full = []
            for chunk in resp:
                t = chunk.choices[0].delta.content
                if t:
                    full.append(t)
                    yield f"data: {json.dumps({'text': t})}\n\n"
            cleaned = strip_meta_commentary(''.join(full))
            if cleaned != ''.join(full):
                yield f"data: {json.dumps({'correction': cleaned})}\n\n"
            # Send chapter excerpt for next-chapter context (first 400 words)
            excerpt = ' '.join(cleaned.split()[:400])
            yield f"data: {json.dumps({'chapterDone': True, 'excerpt': excerpt, 'isLast': is_last})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(stream(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    print(f"\nStory Forge running at http://localhost:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=False)
