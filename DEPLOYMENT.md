# 🌐 PRODUCTION DEPLOYMENT GUIDE

This guide details the deployment of the NIAT AI Admission Copilot to production across **Vercel** (Frontend), **Render / Railway** (Backend), and **Supabase** (PostgreSQL Database).

---

## 1. Obtaining Required API Keys

### A. Groq API Key (Fast Inference for LLaMA 3.3 70B)
1. Visit [https://console.groq.com](https://console.groq.com) and create an account.
2. In the left sidebar, navigate to **API Keys**.
3. Click **Create API Key**, enter a descriptive name (e.g. `NIAT-Copilot-Prod`), and copy the key (`gsk_...`).
4. Set in your `.env` or cloud environment variables:
   ```env
   GROQ_API_KEY=gsk_your_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

### B. Supabase PostgreSQL (Managed Database with pgvector)
1. Sign up at [https://supabase.com](https://supabase.com) and click **New Project**.
2. Set your database password and choose your region (e.g. `ap-south-1` Mumbai).
3. Once created, go to **SQL Editor**, open the [supabase/schema.sql](file:///supabase/schema.sql) file from this repository, and execute it.
4. Go to **Project Settings > API** and copy:
   - **Project URL**: `https://your-ref.supabase.co`
   - **anon / public key**: `eyJhbG...`
5. Go to **Database Settings > Connection Pooling** to obtain your PostgreSQL connection string for Python:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres.your-ref:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```

---

## 2. Deploying the Backend (Render / Railway / Fly.io)

### Option A: Render
1. Connect your GitHub repository to [Render](https://render.com).
2. Click **New + > Web Service**.
3. Select your repository and specify:
   - **Root Directory**: `.`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. In **Environment Variables**, add:
   - `GROQ_API_KEY`
   - `GROQ_MODEL=llama-3.3-70b-versatile`
   - `DATABASE_URL` (or leave default for local SQLite storage)
   - `CORS_ORIGINS=["https://your-frontend.vercel.app","*"]`
5. Click **Create Web Service**. Note your public URL (e.g. `https://niat-backend.onrender.com`).

---

## 3. Deploying the Frontend (Vercel)

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Choose **Import Project** and select the repository.
3. Configure settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://niat-backend.onrender.com`
5. Click **Deploy**. Vercel will build and assign your domain (e.g. `https://niat-copilot.vercel.app`).

---

## 4. Verification in Production

1. Test `/api/health` on your deployed backend.
2. In the deployed frontend, send a query: *"What exactly is NIAT?"*
3. Toggle to **Parent Mode** and request: *"Explain to my father in Telugu"*.
4. Open the **4-Year Cost Calculator**, modify numbers, and confirm deterministic arithmetic calculations.
5. Open the **41+ Campus Directory**, compare Hyderabad campuses.
6. Submit a sample counselling inquiry with consent and verify that it appears immediately in the **Admin Growth Dashboard** (`/admin`).
