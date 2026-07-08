# Deployment Guide: Smart HR Recruitment Agent

This guide outlines the production deployment steps for the MongoDB database, FastAPI backend, and React frontend.

---

## 1. Database Deployment (MongoDB Atlas)

1. Sign up/log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new project and provision a **Free Shared Cluster** (M0 sandbox).
3. Set up Database Access:
   - Create a database user with read/write privileges. Note the password.
4. Set up Network Access:
   - Add a connection IP. For deployment services like Render, add `0.0.0.0/0` (Allow Access from Anywhere) or specify Render's outbound IPs.
5. Retrieve your connection string:
   - Click **Connect** -> **Drivers** -> **Python**.
   - Copy the URI connection string. It will look like:
     `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`
   - Replace `<username>` and `<password>` with your created database credentials, and append the database name `/smart_hr` before `?`.

---

## 2. Backend Deployment (Render)

1. Log in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your Git repository.
4. Configure the Web Service:
   - **Name**: `smart-hr-recruitment-backend`
   - **Environment**: `Python 3`
   - **Region**: Select closest to your database location.
   - **Branch**: `main`
   - **Root Directory**: `backend` (or leave empty if deploying a mono-repo, set root directory accordingly)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Click **Advanced** and add the following **Environment Variables**:
   - `MONGODB_URI` = `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/smart_hr?retryWrites=true&w=majority`
   - `JWT_SECRET` = `[Generate a strong secret key using openssl rand -hex 32]`
   - `GEMINI_API_KEY` = `[Your Google Gemini API key]`
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = `[Your gmail account]`
   - `SMTP_PASS` = `[Your gmail App Password]`
   - `EMAIL_FROM_NAME` = `Smart HR Recruitment`
6. Deploy the Web Service. Copy the Render URL (e.g. `https://smart-hr-recruitment-backend.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Import your Git repository.
4. Configure the Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `[Your Render backend URL from Step 2, appended with /api]` (e.g., `https://smart-hr-recruitment-backend.onrender.com/api`)
6. Click **Deploy**. Vercel will build and host your frontend. Open the generated domain.
