import os
import json
import uuid
import re as _re
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
import psycopg2
import psycopg2.extras
from flask import Flask, request, Response, send_from_directory, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv(Path(__file__).parent / '.env')

app = Flask(__name__, static_folder='public', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(32))

client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# ── Database ───────────────────────────────────────────────────────────────────

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=psycopg2.extras.RealDictCursor)

def init_db():
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    display_name TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TABLE IF NOT EXISTS stories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    title TEXT NOT NULL,
                    genre TEXT,
                    tone TEXT,
                    author_style TEXT,
                    content TEXT NOT NULL,
                    is_public BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
        conn.commit()
        conn.close()
        print("Database ready.")
    except Exception as e:
        print(f"Database init warning: {e}")

def current_user_id():
    return session.get('user_id')

def current_user():
    uid = current_user_id()
    if not uid:
        return None
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, display_name FROM users WHERE id = %s", (uid,))
            user = cur.fetchone()
        conn.close()
        return dict(user) if user else None
    except Exception:
        return None

# ── Auth routes ────────────────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    display_name = (data.get('displayName') or email.split('@')[0]).strip()

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                conn.close()
                return jsonify({'error': 'An account with that email already exists'}), 409
            cur.execute(
                "INSERT INTO users (email, password_hash, display_name) VALUES (%s, %s, %s) RETURNING id, email, display_name",
                (email, generate_password_hash(password), display_name)
            )
            user = cur.fetchone()
        conn.commit()
        conn.close()
        session['user_id'] = str(user['id'])
        return jsonify({'user': {'id': str(user['id']), 'email': user['email'], 'displayName': user['display_name']}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, display_name, password_hash FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
        conn.close()
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Incorrect email or password'}), 401
        session['user_id'] = str(user['id'])
        return jsonify({'user': {'id': str(user['id']), 'email': user['email'], 'displayName': user['display_name']}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'ok': True})


@app.route('/api/auth/me')
def me():
    user = current_user()
    if not user:
        return jsonify({'user': None})
    return jsonify({'user': {'id': str(user['id']), 'email': user['email'], 'displayName': user['display_name']}})


@app.route('/api/user/stories')
def user_stories():
    uid = current_user_id()
    if not uid:
        return jsonify({'error': 'Not logged in'}), 401
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, title, genre, tone, author_style, created_at FROM stories "
                "WHERE user_id = %s ORDER BY created_at DESC LIMIT 50",
                (uid,)
            )
            rows = cur.fetchall()
        conn.close()
        return jsonify({'stories': [
            {**dict(r), 'id': str(r['id']), 'created_at': r['created_at'].isoformat()}
            for r in rows
        ]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

TEXT_MODEL    = 'gpt-4o'
CHAPTER_WORDS = 1800

# ── Author styles ──────────────────────────────────────────────────────────────

AUTHOR_STYLES = {
    'fantasy': [
        ('tolkien',   'J.R.R. Tolkien',       'mythic and world-building — invented history, legends, and languages; sweeping epic scope with a deep sense of the ancient'),
        ('martin',    'George R.R. Martin',    'morally grey characters, political intrigue, brutal consequences, and meticulous world detail that makes the impossible feel real'),
        ('gaiman',    'Neil Gaiman',           'lyrical and myth-infused — dreamlike atmosphere with quiet menace, modern fairy-tale sensibility, and poetic sentence rhythm'),
        ('pratchett', 'Terry Pratchett',       'sharp satirical wit, comic timing, humanist warmth — jokes that cut deeper the more you think about them'),
        ('sanderson', 'Brandon Sanderson',     'systematic magic with clear rules, cause-and-effect plotting, emphasis on character growth under pressure'),
    ],
    'scifi': [
        ('asimov',  'Isaac Asimov',       'clean, logical prose focused on big ideas about society and technology; dialogue-heavy with an essayistic quality'),
        ('herbert', 'Frank Herbert',      'dense and layered — philosophical depth, political ecology, inner monologue, and a sense of vast historical forces'),
        ('dick',    'Philip K. Dick',     'paranoid and reality-questioning; ordinary people in extraordinary situations; prose that feels slightly off-kilter'),
        ('clarke',  'Arthur C. Clarke',   'scientific wonder, clean economical prose, awe at the scale of the universe, optimism about human potential'),
        ('weir',    'Andy Weir',          'first-person technical problem-solving, dry humor, scientific accuracy, everyman voice'),
    ],
    'romance': [
        ('sparks',  'Nicholas Sparks',  'emotional and bittersweet; Southern US settings; themes of love, loss, and sacrifice; accessible prose that earns its tears'),
        ('hoover',  'Colleen Hoover',   'raw emotional intensity, contemporary voice, complex family dynamics, willingness to go to dark places'),
        ('quinn',   'Julia Quinn',      'sparkling Regency wit, comedic misunderstandings, sharp banter, heroines who hold their own'),
        ('roberts', 'Nora Roberts',     'strong capable heroines, fast-paced plotting, vivid sense of place, satisfying romantic tension'),
    ],
    'mystery': [
        ('christie', 'Agatha Christie',         'elegant fair-play plotting, dry wit, drawing-room atmosphere, satisfying reveals where every clue was visible'),
        ('chandler', 'Raymond Chandler',        'hard-boiled first-person narration, Los Angeles noir, sharp similes, morally compromised world'),
        ('doyle',    'Arthur Conan Doyle',      'methodical deduction, Watson-as-narrator grounding the extraordinary, Victorian atmosphere and gentlemanly adventure'),
        ('flynn',    'Gillian Flynn',           'unreliable narrators, psychological darkness, biting social satire, prose with real edge'),
    ],
    'horror': [
        ('king',     'Stephen King',    'deep character backstory, small-town America, slow-burn dread, vernacular first-person voice, earned scares'),
        ('jackson',  'Shirley Jackson', 'quiet domestic menace, psychological unease, the horror of the ordinary, restrained and precise prose'),
        ('lovecraft','H.P. Lovecraft',  'cosmic dread, the unknowable, ornate vocabulary, encroaching madness, awe at humanity\'s insignificance'),
    ],
    'comedy': [
        ('pratchett', 'Terry Pratchett',   'satirical wit with deep humanist warmth, absurdist logic that holds together, jokes with philosophical payoff'),
        ('adams',     'Douglas Adams',     'deadpan absurdism, digressions that circle back perfectly, mock-scientific explanations for the ridiculous'),
        ('wodehouse', 'P.G. Wodehouse',    'light British farce, ingeniously tangled plots, aristocratic buffoonery, sunny prose with perfect comic timing'),
    ],
    'adventure': [
        ('verne',      'Jules Verne',              'scientific optimism, meticulous geographical and technical detail, wonder at exploration and discovery'),
        ('london',     'Jack London',              'raw nature, survival against the elements, naturalistic prose, human will tested to its limits'),
        ('stevenson',  'Robert Louis Stevenson',   'swashbuckling action, vivid memorable characters, moral complexity beneath the adventure'),
    ],
    'fairytale': [
        ('andersen', 'Hans Christian Andersen', 'melancholy beauty, spiritual yearning, bittersweet endings, lyrical prose with quiet pathos'),
        ('gaiman',   'Neil Gaiman',             'dark fairy tale reimagining, mythic resonance, modern sensibility through an ancient lens'),
        ('carter',   'Angela Carter',           'lush Gothic prose, subverted archetypes, feminist retellings with rich sensory language'),
    ],
    'christian': [
        ('rivers',     'Francine Rivers',  'redemptive faith journeys, historical depth, emotional weight, characters transformed by grace'),
        ('kingsbury',  'Karen Kingsbury',  'contemporary family-centered stories, emotionally accessible faith, hope through hardship'),
        ('lewis',      'Beverly Lewis',    'Amish community settings, gentle lyrical pace, themes of belonging, sacrifice, and belief'),
    ],
    'spicy': [],  # style descriptors preferred over named authors here
}

def get_author_style_instruction(author_key, genre):
    styles = AUTHOR_STYLES.get(genre, [])
    match = next((s for s in styles if s[0] == author_key), None)
    if not match:
        return None
    _, name, description = match
    return (
        f"WRITING STYLE — channel {name}: {description}. "
        f"Capture their distinctive voice and approach. Do not copy any actual text from their works — "
        f"embody the spirit, not the letter."
    )

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


CRAFT_SYSTEM_PROMPT = """You are an award-winning fiction writer. You craft vivid, emotionally resonant, personalized stories. Every story feels made for exactly the person reading it.

CRAFT RULES:
- Show emotion through specific physical sensation and action — never label it ("she felt nervous" → show the dry mouth, the fingers that won't stay still)
- Use concrete, specific detail. A cracked leather chair beats "an old chair"
- Vary sentence rhythm deliberately — short sentences land punches; long ones build atmosphere
- Dialogue must reveal character, not just deliver information
- End at the moment of maximum resonance, not after it

WHAT TO AVOID:
- Stale phrasing: "storm-grey eyes", "heart kicked up a notch", "filled a room", voice-as-food metaphors, "unspoken anything", "every syllable a caress", "masked with professional courtesy"
- Adverbs substituting for strong verbs: nervously, softly, suddenly, deeply
- Announcing emotion: "She felt...", "He realized...", "She noticed..."
- Generic atmosphere that could belong to any story
- Vague endings that go abstract right when they should get concrete and specific"""


@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.get_json()
    if not data or not isinstance(data.get('characters'), list):
        return {'error': 'Invalid request'}, 400

    def stream():
        try:
            prompt = build_prompt(data)
            # Build messages — inject author style into system if specified
            author_key   = data.get('authorStyle', '')
            genre        = data.get('genre', 'fantasy')
            author_instr = get_author_style_instruction(author_key, genre) if author_key else None
            system_msg   = CRAFT_SYSTEM_PROMPT
            if author_instr:
                system_msg += f"\n\n{author_instr}"

            resp = client.chat.completions.create(
                model=TEXT_MODEL, max_tokens=4096, stream=True,
                messages=[
                    {'role': 'system', 'content': system_msg},
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


# ── Share / Read ───────────────────────────────────────────────────────────────

@app.route('/api/share', methods=['POST'])
def share_story():
    data = request.get_json()
    if not data or not data.get('content'):
        return {'error': 'No content to share'}, 400
    try:
        conn = get_db()
        uid = current_user_id()
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO stories (user_id, title, genre, tone, author_style, content, is_public) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (
                    uid,
                    data.get('title', 'Untitled'),
                    data.get('genre', ''),
                    data.get('tone', ''),
                    data.get('authorStyle', ''),
                    data.get('content', ''),
                    True,
                )
            )
            story_id = cur.fetchone()['id']
        conn.commit()
        conn.close()
        return jsonify({'id': str(story_id)})
    except Exception as e:
        return {'error': str(e)}, 500


@app.route('/s/<story_id>')
def read_story(story_id):
    try:
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM stories WHERE id = %s", (story_id,))
            story = cur.fetchone()
        conn.close()
        if not story:
            return "Story not found.", 404

        title       = story['title'] or 'Untitled'
        content     = story['content'] or ''
        genre       = story['genre'] or ''
        tone        = story['tone'] or ''
        author_style = story['author_style'] or ''

        # Format content as HTML paragraphs
        paragraphs  = [p.strip() for p in content.split('\n\n') if p.strip()]
        paras_html  = ''.join(
            f'<p class="{"first-para" if i == 0 else ""}">{p}</p>'
            for i, p in enumerate(paragraphs)
        )

        meta_parts = [g.title() for g in [genre, tone] if g]
        if author_style:
            meta_parts.append(f'In the style of {author_style.replace("-", " ").title()}')
        meta_str = ' · '.join(meta_parts)

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title} — Story Forge</title>
  <meta property="og:title" content="{title}"/>
  <meta property="og:description" content="A personalized story generated on Story Forge"/>
  <style>
    *,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
    body{{font-family:Georgia,'Times New Roman',serif;background:#0f0e17;color:#e8e4f0;min-height:100vh;line-height:1.8}}
    .header{{text-align:center;padding:40px 20px 28px;background:linear-gradient(180deg,#1a0e2e,#0f0e17);border-bottom:1px solid #3a3358}}
    .logo-link{{text-decoration:none;color:inherit;display:inline-block;margin-bottom:8px}}
    .logo-link:hover .site-name{{opacity:0.8}}
    .site-name{{font-size:1rem;font-family:sans-serif;letter-spacing:2px;color:#9b95b3;text-transform:uppercase}}
    h1{{font-size:2rem;font-weight:normal;font-style:italic;background:linear-gradient(135deg,#b08aff,#ff8c69);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px;line-height:1.3}}
    .meta{{font-family:sans-serif;font-size:0.8rem;color:#9b95b3;letter-spacing:0.5px}}
    main{{max-width:680px;margin:0 auto;padding:40px 20px 80px}}
    .story{{background:#1a1828;border:1px solid #3a3358;border-radius:12px;padding:40px 48px;font-size:1.05rem;line-height:1.95}}
    @media(max-width:560px){{.story{{padding:22px 20px}}}}
    .story p{{margin-bottom:1.3em}}
    .story p:last-child{{margin-bottom:0}}
    .first-para::first-letter{{font-size:3.2em;line-height:0.75;float:left;margin:0.06em 0.1em 0 0;color:#b08aff;font-weight:bold}}
    .cta{{text-align:center;margin-top:40px;padding-top:32px;border-top:1px solid #3a3358}}
    .cta p{{color:#9b95b3;font-family:sans-serif;font-size:0.9rem;margin-bottom:16px}}
    .cta a{{display:inline-block;background:linear-gradient(135deg,#b08aff,#ff8c69);color:#0a0a14;padding:13px 32px;border-radius:50px;text-decoration:none;font-family:sans-serif;font-weight:800;font-size:1rem;transition:transform 0.2s,box-shadow 0.2s}}
    .cta a:hover{{transform:translateY(-2px);box-shadow:0 6px 24px rgba(176,138,255,0.4)}}
    footer{{text-align:center;padding:20px;color:#9b95b3;font-family:sans-serif;font-size:0.78rem;border-top:1px solid #3a3358}}
  </style>
</head>
<body>
  <div class="header">
    <a href="/" class="logo-link"><div class="site-name">📖 Story Forge</div></a>
    <h1>{title}</h1>
    <div class="meta">{meta_str}</div>
  </div>
  <main>
    <div class="story">{paras_html}</div>
    <div class="cta">
      <p>This story was created on Story Forge — generate your own with your characters.</p>
      <a href="/">Forge Your Own Story →</a>
    </div>
  </main>
  <footer>AI-generated story · Story Forge</footer>
</body>
</html>"""
    except Exception as e:
        return f"Error loading story: {e}", 500


if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 3000))
    print(f"\nStory Forge running at http://localhost:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=False)
