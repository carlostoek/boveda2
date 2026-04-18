# PromptVault Simplificado - Implementation Plan

**Goal:** Build a simplified version of PromptVault with Flask backend, React frontend, SQLite (dev)/PostgreSQL (prod), without Redis/queue (synchronous AI analysis), includes images, CRUD, AI analysis option.

**Architecture:** Single service - Flask serves API and static files in production. SQLite for dev, PostgreSQL for prod via SQLAlchemy with Flask-SQLAlchemy.

**Tech Stack:** Flask, SQLAlchemy, Flask-CORS, OpenRouter API (synchronous), React + Vite + Tailwind

---

## Task 1: Backend - Project Structure & Config

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/config.py`
- Create: `backend/app.py` (Flask app factory)
- Create: `backend/database.py` (SQLAlchemy setup)
- Create: `backend/.env.example`
- Create: `backend/models/prompt.py`
- Create: `backend/models/tag.py`

- [ ] **Step 1: Create backend directory and requirements.txt**

```bash
mkdir -p /root/repos/boveda2/backend/models /root/repos/boveda2/backend/routes /root/repos/boveda2/backend/services /root/repos/boveda2/backend/uploads
touch /root/repos/boveda2/backend/__init__.py
```

**Create requirements.txt:**
```txt
flask==3.1.0
flask-sqlalchemy==3.1.1
flask-cors==5.0.0
sqlalchemy==2.0.36
psycopg2-binary==2.9.10
python-dotenv==1.0.1
pydantic==2.10.5
httpx==0.28.1
pillow==11.1.0
gunicorn==23.0.0
alembic==1.14.0
```

- [ ] **Step 2: Create config.py**

```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "sqlite:///prompts.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB max file size
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
```

- [ ] **Step 3: Create database.py**

```python
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData

convention = {
    "ix": "ix_%(column_0_label)",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=convention)
db = SQLAlchemy(metadata=metadata)

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
```

- [ ] **Step 1: Create app.py**

```python
from flask import Flask
from flask_cors import CORS
from config import Config
from database import db, init_db
import os

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]})
    
    db.init_app(app)
    
    from routes import prompts, tags, health
    app.register_blueprint(health.bp)
    app.register_blueprint(prompts.bp)
    app.register_blueprint(tags.bp)
    
    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=3001)
```

- [ ] **Step 1: Create .env.example**

```bash
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///prompts.db
# For production PostgreSQL: postgresql://user:password@host/dbname
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openai/gpt-4o-mini
CORS_ORIGINS=http://localhost:5173
```

---

## Task 2: Database Models

- [ ] **Step 1: Create Tag model in backend/models/__init__.py**

```python
# backend/models/__init__.py
from .prompt import Prompt
from .tag import Tag
from .prompt_tag import prompt_tags
__all__ = ["Prompt", "Tag", "prompt_tags"]
```

- [ ] **Step 2: Create Tag model**

```python
# backend/models/tag.py
import uuid
from database import db
from sqlalchemy.dialects.postgresql import UUID

class Tag(db.Model):
    __tablename__ = "tags"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), unique=True, nullable=False)
    normalized_name = db.Column(db.String(255), unique=True, nullable=False)
    usage_count = db.Column(db.Integer, default=0)
    
    prompts = db.relationship("Prompt", secondary="prompt_tags", back_populates="tags")
    
    @staticmethod
    def normalize(name):
        return name.lower().strip().replace(" ", "-")
    
    @staticmethod
    def get_or_create(name):
        normalized = Tag.normalize(name)
        tag = Tag.query.filter_by(normalized_name=normalized).first()
        if not tag:
            tag = Tag(name=name, normalized_name=normalized)
            db.session.add(tag)
            db.session.commit()
        return tag
```

- [ ] **Step 3: Create prompt_tags association table in backend/models/prompt_tags.py**

```python
# backend/models/prompt_tag.py
from database import db

prompt_tags = db.Table(
    "prompt_tags",
    db.Column("prompt_id", db.String(36), db.ForeignKey("prompts.id"), primary_key=True),
    db.Column("tag_id", db.String(36), db.ForeignKey("tags.id"), primary_key=True)
)
```

- [ ] **Step 4: Create Prompt model**

```python
# backend/models/prompt.py
import uuid
from database import db
from sqlalchemy.dialects.postgresql import UUID
import json

class Prompt(db.Model):
    __tablename__ = "prompts"
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(500))
    description = db.Column(db.Text)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), default="TEXTO")
    subcategory = db.Column(db.String(100))
    metadata = db.Column(db.Text)  # JSON as text
    image_url = db.Column(db.String(500))
    is_favorite = db.Column(db.Boolean, default=False)
    analysis_status = db.Column(db.String(20), default="PENDING")  # PENDING, COMPLETED, FAILED
    analysis_result = db.Column(db.Text)  # JSON as text
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    
    tags = db.relationship("Tag", secondary="prompt_tags", back_populates="prompts")
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "content": self.content,
            "category": self.category,
            "subcategory": self.subcategory,
            "metadata": json.loads(self.metadata) if self.metadata else None,
            "image_url": self.image_url,
            "is_favorite": self.is_favorite,
            "analysis_status": self.analysis_status,
            "analysis_result": json.loads(self.analysis_result) if self.analysis_result else None,
            "tags": [t.name for t in self.tags],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
```

- [ ] **Step 5: Add imports to prompt.py models**

Add after the model:
```python
from models.prompt_tags import prompt_tags
```

---

## Task 3: Routes - Basic CRUD

- [ ] **Step 1: Create health route (backend/routes/health.py)**

```python
# backend/routes/health.py
from flask import Blueprint, jsonify

bp = Blueprint("health", __name__)

@bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})
```

- [ ] **Step 2: Create prompts route with full CRUD (backend/routes/prompts.py)**

```python
# backend/routes/prompts.py
import json
from flask import Blueprint, request, jsonify, url_for
from database import db
from models.prompt import Prompt
from models.tag import Tag
from services.ai import analyze_prompt
import os
from werkzeug.utils import secure_filename
import uuid

bp = Blueprint("prompts", __name__, url_prefix="/api/prompts")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@bp.route("", methods=["GET"])
def list_prompts():
    query = Prompt.query
    
    # Filters
    category = request.args.get("category")
    if category:
        query = query.filter(Prompt.category == category)
    
    search = request.args.get("search")
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            db.or_(
                Prompt.title.ilike(search_term),
                Prompt.description.ilike(search_term),
                Prompt.content.like(search_term)
            )
        )
    
    favorites_only = request.args.get("favorites")
    if favorites_only == "true":
        query = query.filter(Prompt.is_favorite == True)
    
    prompts = query.order_by(Prompt.created_at.desc()).all()
    return jsonify([p.to_dict() for p in prompts])

@bp.route("", methods=["POST"])
def create_prompt():
    content = request.form.get("content")
    if not content:
        return jsonify({"error": "content is required"}), 400
    
    analyze = request.form.get("analyze", "false").lower() == "true"
    
    # Handle image upload
    image_url = None
    if "image" in request.files:
        file = request.files["image"]
        if file and allowed_file(file.filename):
            filename = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
            filepath = os.path.join("uploads", filename)
            file.save(filepath)
            image_url = f"/uploads/{filename}"
    
    # Create prompt
    prompt = Prompt(
        content=content,
        image_url=image_url,
        analysis_status="PENDING" if analyze else "MANUAL"
    )
    db.session.add(prompt)
    
    if analyze:
        try:
            result = analyze_prompt(content)
            prompt.title = result.get("title")
            prompt.description = result.get("description")
            prompt.category = result.get("category", "TEXTO")
            prompt.subcategory = result.get("subcategory")
            prompt.metadata = json.dumps(result.get("metadata", {}))
            prompt.analysis_result = json.dumps(result)
            prompt.analysis_status = "COMPLETED"
            
            # Create tags
            for tag_name in result.get("tags", []):
                tag = Tag.get_or_create(tag_name)
                prompt.tags.append(tag)
        except Exception as e:
            prompt.analysis_status = "FAILED"
            prompt.analysis_result = json.dumps({"error": str(e)})
    
    db.session.commit()
    return jsonify(prompt.to_dict()), 201

@bp.route("/<prompt_id>", methods=["GET"])
def get_prompt(prompt_id):
    prompt = Prompt.query.get_or_404(prompt_id)
    return jsonify(prompt.to_dict())

@bp.route("/<prompt_id>", methods=["PUT"])
def update_prompt(prompt_id):
    prompt = Prompt.query.get_or_404(prompt_id)
    
    content = request.form.get("content")
    if content:
        prompt.content = content
    
    title = request.form.get("title")
    if title is not None:
        prompt.title = title
    
    description = request.form.get("description")
    if description is not None:
        prompt.description = description
    
    analyze = request.form.get("reanalyze", "false").lower() == "true"
    
    if analyze:
        try:
            result = analyze_prompt(prompt.content)
            prompt.title = prompt.title or result.get("title")
            prompt.description = prompt.description or result.get("description")
            prompt.category = result.get("category", prompt.category)
            prompt.subcategory = result.get("subcategory")
            prompt.metadata = json.dumps(result.get("metadata", {}))
            prompt.analysis_result = json.dumps(result)
            prompt.100="COMPLETED"
            prompt.tags = []
            for tag_name in result.get("tags", []):
                tag = Tag.get_or_create(tag_name)
                prompt.tags.append(tag)
        except Exception as e:
            prompt.analysis_status = "FAILED"
    
    db.session.commit()
    return jsonify(prompt.to_dict())

@bp.route("/<prompt_id>", methods=["DELETE"])
def delete_prompt(prompt_id):
    prompt = Prompt.query.get_or_404(prompt_id)
    db.session.delete(prompt)
    db.session.commit()
    return jsonify({"message": "deleted"}

@bp.route("/<prompt_id>/favorite", methods=["POST"])
def toggle_favorite(prompt_id):
    prompt = Prompt.query.get_or_404(prompt_id)
    prompt.is_favorite = not prompt.is_favorite
    db.session.commit()
    return jsonify(prompt.to_dict())
```

- [ ] **Step 3: Create tags route**

```python
# backend/routes/tags.py
from flask import Blueprint, request, jsonify
from models.tag import Tag

bp = Blueprint("tags", __name__, url_prefix="/api/tags")

@bp.route("", methods=["GET"])
def list_tags():
    tags = Tag.query.order_by(Tag.usage_count.desc()).all()
    return jsonify([{"id": t.id, "name": t.name, "usage_count": t.usage_count} for t in tags])

@bp.route("/suggest", methods=["GET"])
def suggest_tags():
    query = request.args.get("q", "")
    if not query:
        return jsonify([])
    
    tags = Tag.query.filter(Tag.name.ilike(f"%{query}%")).limit(10).all()
    return jsonify([t.name for t in tags])
```

- [ ] **Step 4: Add __init__.py to routes**

```python
# backend/routes/__init__.py
from . import prompts, tags, health
```

---

## Task 4: AI Service

- [ ] **Step 1: Create AI service (backend/services/ai.py)**

```python
# backend/services/ai.py
import httpx
import json
from config import Config

SYSTEM_PROMPT = """Eres un analizador de prompts. Analiza el siguiente prompt y devuelve un JSON con:
- "title": título corto en inglés
- "description": descripción breve en español
- "category": una de: IMAGEN, VIDEO, TEXTO, AUDIO
- "subcategory": subcategoría específica
- "tags": array de tags relevantes
- "metadata": objeto con campos específicos según la categoría

Categorías:
- IMAGEN: "fotografia", "ilustracion", "diseno", "arte", "icono", "logo", "banner"
- VIDEO: "animacion", "motion", "efectos", "edicion"
- TEXTO: "redaccion", "resumen", "traduccion", "codigo", "creativo"
- AUDIO: "musica", "mezcla", "efectos_sonido"
"""

async def analyze_prompt(content: str) -> dict:
    if not Config.OPENROUTER_API_KEY:
        raise Exception("OPENROUTER_API_KEY not configured")
    
    headers = {
        "Authorization": f"Bearer {Config.OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": Config.OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content}
        ],
        "max_tokens": 1000
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60.0
        )
    
    if response.status_code != 200:
        raise Exception(f"OpenRouter error: {response.text}")
    
    data = response.json()
    content = data["choices"][0]["message"]["content"]
    
    # Try to extract JSON
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        return json.loads(content.strip())
    except:
        return {
            "title": "Analyzed Prompt",
            "description": content[:200],
            "category": "TEXTO",
            "subcategory": "redaccion",
            "tags": [],
            "metadata": {}
        }

def analyze_prompt_sync(content: str) -> dict:
    """Synchronous wrapper for Flask"""
    import asyncio
    return asyncio.run(analyze_prompt(content))
```

- [ ] **Step 2: Update prompts route to use sync version**

Change import in routes/prompts.py:
```python
from services.ai import analyze_prompt_sync as analyze_prompt
```

- [ ] **Step 3: Add service __init__.py**

```python
# backend/services/__init__.py
from .ai import analyze_prompt_sync
```

---

## Task 5: Frontend - React + Vite Setup

- [ ] **Step 1: Create frontend structure**

```bash
mkdir -p src/components src/stores src/services src/types
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "promptvault-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.3",
    "lucide-react": "^0.468.0",
    "sonner": "^1.7.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vite": "^6.1.0"
  }
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001'
    }
  }
})
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create tailwind.config.js**

```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 6: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 7: Create index.html**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PromptVault</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 1: Create src/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 2: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #f8fafc;
}
```

- [ ] **Step 1: Create src/types/index.ts**

```typescript
export interface Prompt {
  id: string;
  title: string | null;
  description: string | null;
  content: string;
  category: 'IMAGEN' | 'VIDEO' | 'TEXTO' | 'AUDIO';
  subcategory: string | null;
  metadata: Record<string, unknown> | null;
  image_url: string | null;
  is_favorite: boolean;
  analysis_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'MANUAL';
  analysis_result: Record<string, unknown> | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type Category = 'IMAGEN' | 'VIDEO' | 'TEXTO' | 'AUDIO';

export interface CreatePromptPayload {
  content: string;
  analyze: boolean;
  image?: File;
}

export interface UpdatePromptPayload {
  content?: string;
  title?: string;
  description?: string;
  reanalyze?: boolean;
}
```

---

## Task 6: Frontend - API Service & Store

- [ ] **Step 1: Create API service (src/services/api.ts)**

```typescript
import { Prompt, CreatePromptPayload, UpdatePromptPayload } from '../types';

const API_URL = '/api';

export const api = {
  async getPrompts(params?: { category?: string; search?: string; favorites?: boolean }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.favorites) query.set('favorites', 'true');
    
    const res = await fetch(`${API_URL}/prompts?${query}`);
    return res.json();
  },

  async getPrompt(id: string): Promise<Prompt> {
    const res = await fetch(`${API_URL}/prompts/${id}`);
    return res.json();
  },

  async createPrompt(payload: CreatePromptPayload) {
    const formData = new FormData();
    formData.append('content', payload.content);
    formData.append('analyze', payload.analyze.toString());
    if (payload.image) {
      formData.append('image', payload.image);
    }
    
    const res = await fetch(`${API_URL}/prompts`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async updatePrompt(id: string, payload: UpdatePromptPayload) {
    const formData = new FormData();
    if (payload.content) formData.append('content', payload.content);
    if (payload.title) formData.append('title', payload.title);
    if (payload.description) formData.append('description', payload.description);
    if (payload.reanalyze) formData.append('reanalyze', 'true');
    
    const res = await fetch(`${API_URL}/prompts/${id}`, {
      method: 'PUT',
      body: formData,
    });
    return res.json();
  },

  async deletePrompt(id: string) {
    await fetch(`${API_URL}/prompts/${id}`, { method: 'DELETE' });
  },

  async toggleFavorite(id: string) {
    const res = await fetch(`${API_URL}/prompts/${id}/favorite`, {
      method: 'POST',
    });
    return res.json();
  },

  async getTags() {
    const res = await fetch(`${API_URL}/tags`);
    return res.json();
  },

  async suggestTags(q: string) {
    const res = await fetch(`${API_URL}/tags/suggest?q=${encodeURIComponent(q)}`);
    return res.json();
  },
};
```

- [ ] **Step 2: Create Zustand store (src/stores/promptStore.ts)**

```typescript
import { create } from 'zustand';
import { Prompt, Category } from '../types';
import { api } from '../services/api';

interface PromptStore {
  prompts: Prompt[];
  loading: boolean;
  error: string | null;
  selectedPrompt: Prompt | null;
  showCreateModal: boolean;
  showDetailModal: boolean;
  filters: {
    category: Category | '';
    search: string;
    favorites: boolean;
  };
  
  fetchPrompts: () => Promise<void>;
  setSelectedPrompt: (prompt: Prompt | null) => void;
  setShowCreateModal: (show: boolean) => void;
  setShowDetailModal: (show: boolean) => void;
  setFilters: (filters: Partial<PromptStore['filters']>) => void;
  createPrompt: (content: string, analyze: boolean, image?: File) => Promise<void>;
  updatePrompt: (id: string, content: string, reanalyze: boolean) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
}

export const usePromptStore = create<PromptStore>((set, get) => ({
  prompts: [],
  loading: false,
  error: null,
  selectedPrompt: null,
  showCreateModal: false,
  showDetailModal: false,
  filters: {
    category: '',
    search: '',
    favorites: false,
  },
  
  fetchPrompts = async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const prompts = await api.getPrompts({
        category: filters.category || undefined,
        search: filters.search || undefined,
        favorites: filters.favorites,
      });
      set({ prompts, loading: false });
    } catch (e) {
      set({ error: 'Error fetching prompts', loading: false });
    }
  },
  
  setSelectedPrompt = (prompt) => set({ selectedPrompt: prompt, showDetailModal: !!prompt });
  setShowCreateModal = (show) => set({ showCreateModal: show });
  setShowDetailModal = (show) => set({ showDetailModal: show });
  
  setFilters = (filters) => {
    set({ filters: { ...get().filters, ...filters } });
    get().fetchPrompts();
  },
  
  createPrompt = async (content, analyze, image) => {
    try {
      await api.createPrompt({ content, analyze, image });
      await get().fetchPrompts();
    } catch (e) {
      throw e;
    }
  },
  
  updatePrompt = async (id, content, reanalyze) => {
    try {
      await api.updatePrompt(id, { content, reanalyze });
      await get().fetchPrompts();
      if (get().selectedPrompt?.id === id) {
        const updated = await api.getPrompt(id);
        set({ selectedPrompt: updated });
      }
    } catch (e) {
      throw e;
    }
  },
  
  deletePrompt = async (id) => {
    await api.deletePrompt(id);
    await get().fetchPrompts();
    set({ selectedPrompt: null, showDetailModal: false });
  },
  
  toggleFavorite = async (id) => {
    const updated = await api.toggleFavorite(id);
    set({
      prompts: get().prompts.map(p => p.id === id ? updated : p),
      selectedPrompt: get().selectedPrompt?.id === id ? updated : get().selectedPrompt,
    };
  },
}));
```

---

## Task 7: Frontend - Components

- [ ] **Step 1: Create Header component (src/components/Header.tsx)**

```typescript
import { usePromptStore } from '../stores/promptStore';
import { Search, Filter, Heart, Plus } from 'lucide-react';

export function Header() {
  const { filters, setFilters, setShowCreateModal, fetchPrompts } = usePromptStore();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-slate-800">PromptVault</h1>
          
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar prompts..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && fetchPrompts()}
              />
            </div>
            
            <button
              onClick={() => setFilters({ favorites: !filters.favorites })}
              className={`p-2 rounded-lg border ${filters.favorites ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <Heart className={`w-5 h-5 ${filters.favorites ? 'fill-current' : ''}`} />
            </button>
            
            <select
              value={filters.category}
              onChange={(e) => setFilters({ category: e.target.value as any })}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <option value="IMAGEN">Imagen</option>
              <option value="VIDEO">Video</option>
              <option value="TEXTO">Texto</option>
              <option value="AUDIO">Audio</option>
            </select>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create PromptCard component (src/components/PromptCard.tsx)**

```typescript
import { Prompt } from '../types';
import { Heart, Image } from 'lucide-react';
import { usePromptStore } from '../stores/promptStore';

interface Props {
  prompt: Prompt;
}

const categoryColors: Record<string, string> = {
  IMAGEN: 'bg-emerald-500',
  VIDEO: 'bg-purple-500',
  TEXTO: 'bg-blue-500',
  AUDIO: 'bg-orange-500',
};

export function PromptCard({ prompt }: Props) {
  const { setSelectedPrompt } = usePromptStore();

  return (
    <div
      onClick={() => setSelectedPrompt(prompt)}
      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium text-white rounded ${categoryColors[prompt.category] || 'bg-slate-500'}`}>
            {prompt.category}
          </span>
          {prompt.image_url && (
            <Image className="w-4 h-4 text-slate-400" />
          )}
        </div>
        
        {prompt.is_favorite && (
          <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
        )}
      </div>
      
      <h3 className="mt-2 font-medium text-slate-800 truncate">
        {prompt.title || prompt.content.slice(0, 50)}
      </h3>
      
      {prompt.description && (
        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
          {prompt.description}
        </p>
      )}
      
      <div className="mt-3 flex flex-wrap gap-1">
        {prompt.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create PromptGrid component (src/components/PromptGrid.tsx)**

```typescript
import { usePromptStore } from '../stores/promptStore';
import { PromptCard } from './PromptCard';
import { Loader2 } from 'lucide-react';

export function PromptGrid() {
  const { prompts, loading, error } = usePromptStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        {error}
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No hay prompts todavía. ¡Crea el primero!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </div>
  );
}
```

- [ ] **Step 1: Create CreateModal component (src/components/CreateModal.tsx)**

```typescript
import { useState } from 'react';
import { usePromptStore } from '../stores/promptStore';
import { X, Loader2 } from 'lucide-react';

export function CreateModal() {
  const { showCreateModal, setShowCreateModal, createPrompt } = usePromptStore();
  const [content, setContent] = useState('');
  const [analyze, setAnalyze] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showCreateModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      await createPrompt(content, analyze, image || undefined);
      setContent('');
      setAnalyze(true);
      setImage(null);
      setShowCreateModal(false);
    } catch (err) {
      setError('Error al crear el prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowCreateModal(false);
    setContent('');
    setAnalyze(true);
    setImage(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Nuevo Prompt</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contenido del prompt
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe tu prompt aquí..."
              className="w-full h-40 p-3 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={analyze}
              onChange={(e) => setAnalyze(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-slate-700">Analizar con IA</span>
          </label>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Imagen (opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create DetailModal component (src/components/DetailModal.tsx)**

```typescript
import { usePromptStore } from '../stores/promptStore';
import { X, Heart, Copy, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';

const categoryLabels: Record<string, string> = {
  IMAGEN: 'Imagen',
  VIDEO: 'Video',
  TEXTO: 'Texto',
  AUDIO: 'Audio',
};

const categoryColors: Record<string, string> = {
  IMAGEN: 'bg-emerald-500',
  VIDEO: 'bg-purple-500',
  TEXTO: 'bg-blue-500',
  AUDIO: 'bg-orange-500',
};

export function DetailModal() {
  const { showDetailModal, selectedPrompt, setSelectedPrompt, toggleFavorite, deletePrompt, setShowCreateModal } = usePromptStore();
  const [showEdit, setShowEdit] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);

  if (!showDetailModal || !selectedPrompt) return null;

  const prompt = selectedPrompt;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
  };

  const handleDelete = async () => {
    if (confirm('¿Seguro que quieres eliminar este prompt?')) {
      await deletePrompt(prompt.id);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    setLoading(true);
    try {
      // Update prompt logic would go here
      setShowEdit(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPrompt(null);
    setShowEdit(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-medium text-white rounded ${categoryColors[prompt.category] || 'bg-slate-500'}`}>
              {categoryLabels[prompt.category] || prompt.category}
            </span>
            {prompt.subcategory && (
              <span className="text-xs text-slate-500">{prompt.subcategory}</span>
            )}
          </div>
          
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {prompt.image_url && (
          <div className="border-b">
            <img
              src={prompt.image_url}
              alt="Prompt"
              className="w-full h-64 object-contain bg-slate-100"
            />
          </div>
        )}
        
        <div className="p-4 space-y-4">
          {showEdit ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-40 p-3 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <>
              {prompt.title && <h2 className="text-lg font-semibold">{prompt.title}</h2>}
              {prompt.description && <p className="text-sm text-slate-600">{prompt.description}</p>}
            </>
          )}
          
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="whitespace-pre-wrap text-sm">{prompt.content}</p>
          </div>
          
          {prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {prompt.tags.map((tag) => (
                <span key={tag} className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {prompt.analysis_status === 'PENDING' && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analizando...
            </div>
          )}
          
          <div className="flex items-center gap-2 pt-2 border-t">
            <button
              onClick={() => toggleFavorite(prompt.id)}
              className={`p-2 rounded-lg ${prompt.is_favorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
            >
              <Heart className={`w-5 h-5 ${prompt.is_favorite ? 'fill-current' : ''}`} />
            </button>
            
            <button onClick={handleCopy} className="p-2 text-slate-400 hover:text-blue-500">
              <Copy className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => {
                setShowEdit(true);
                setEditContent(prompt.content);
              }}
              className="p-2 text-slate-400 hover:text-blue-500"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            
            <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          {showEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create FAB component (src/components/FAB.tsx)**

```typescript
import { Plus } from 'lucide-react';
import { usePromptStore } from '../stores/promptStore';

export function FAB() {
  const { setShowCreateModal, showCreateModal } = usePromptStore();

  if (showCreateModal) return null;

  return (
    <button
      onClick={() => setShowCreateModal(true)}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
```

- [ ] **Step 4: Create Toast component (src/components/Toast.tsx)**

```typescript
import { Toaster } from 'sonner';

export function Toast() {
  return <Toaster position="bottom-right" />;
}
```

- [ ] **Step 5: Create App.tsx**

```typescript
import { useEffect } from 'react';
import { usePromptStore } from './stores/promptStore';
import { Header } from './components/Header';
import { PromptGrid } from './components/PromptGrid';
import { CreateModal } from './components/CreateModal';
import { DetailModal } from './components/DetailModal';
import { FAB } from './components/FAB';
import { Toast } from './components/Toast';

export default function App() {
  const { fetchPrompts, showCreateModal, showDetailModal } = usePromptStore();

  useEffect(() => {
    fetchPrompts();
    const interval = setInterval(fetchPrompts, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <PromptGrid />
      </main>
      <FAB />
      {showCreateModal && <CreateModal />}
      {showDetailModal && <DetailModal />}
      <Toast />
    </div>
  );
}
```

---

## Task 8: Testing & Dev Script

- [ ] **Step 1: Create dev.sh script**

```bash
#!/bin/bash

cd "$(dirname "$0")"

echo "Installing backend dependencies..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo "Installing frontend dependencies..."
npm install

echo "Creating .env file..."
cp backend/.env.example backend/.env

echo "Starting backend..."
cd backend
source venv/bin/activate
python app.py &
BACKEND_PID=$!

cd ..
echo "Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo "Done!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
```

- [ ] **Step 2: Create Makefile**

```makefile
.PHONY: install dev db-reset

install:
	cd backend && pip install -r requirements.txt
	npm install

dev:
	@echo "Starting dev servers..."
	cd backend && source venv/bin/activate && python app.py
	npm run dev

db-reset:
	cd backend && source venv/bin/activate && python -c "from app import app, db; app.app_context().push(); db.drop_all(); db.create_all()"

build-prod:
	cd backend && rm -rf venv
	npm run build
```

---

## Verification

To verify implementation works:

1. Start backend: `cd backend && source venv/bin/activate && python app.py`
2. Start frontend: `npm run dev`
3. Open http://localhost:5173

**Expected behavior:**
- Empty grid initially with "No hay prompts" message
- Create modal opens when clicking "+" button
- Creating prompt with analyze=true adds AI metadata
- Cards display in grid with category colors
- Detail modal shows content, image (if any), copy, favorite toggle
- Polling every 5 seconds refreshes list
- Search and filter by category/favorite works