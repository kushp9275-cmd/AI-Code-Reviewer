# SHIELD.AI - AI-Driven Code Reviewer (SAST)

A premium, interactive Static Application Security Testing (SAST) web application powered by the Google Gemini API. It reviews source code (Python, JavaScript, etc.) for security vulnerabilities, formats findings into dynamic charts, and provides side-by-side patch suggestions.

---

## 🛠️ Tech Stack
*   **Backend**: Python, FastAPI, Uvicorn, Pydantic, `google-generativeai` SDK
*   **Frontend**: Tailwind CSS, Vanilla JS, Chart.js

---

## 🚀 Local Quickstart

### Prerequisites
*   Python 3.10+
*   Google AI Studio Gemini API Key

### Setup
1.  **Clone / Download the project files.**
2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Configure API Key**:
    Create a `.env` file in the root directory and add your key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
4.  **Run the Server**:
    ```bash
    uvicorn backend.main:app --reload
    ```
5.  **Access the Dashboard**: Open `http://127.0.0.1:8000` in your web browser.

---

## 📦 Deploying to GitHub

To deploy this project to Render, you first need to push it to your GitHub account:

1.  **Initialize Git Repository**:
    ```bash
    git init
    ```
2.  **Add Files**:
    ```bash
    git add .
    ```
3.  **Commit Changes**:
    ```bash
    git commit -m "Initialize SHIELD.AI SAST Code Reviewer"
    ```
4.  **Create a Repository on GitHub**:
    *   Go to [GitHub](https://github.com/) and create a new **public** or **private** repository (do not initialize with README).
5.  **Link and Push to GitHub**:
    ```bash
    git remote add origin https://github.com/your-username/your-repo-name.git
    git branch -M main
    git push -u origin main
    ```

---

## ☁️ Deploying to Render

Once your code is on GitHub, follow these steps to host it live for free on **Render**:

1.  **Log in to Render**: Sign in at [Render.com](https://render.com/) using your GitHub account.
2.  **Create a New Web Service**:
    *   Click the **New +** button in the dashboard and select **Web Service**.
    *   Connect your GitHub repository.
3.  **Configure Settings**:
    *   **Name**: `shield-ai-sast` (or any custom name)
    *   **Runtime**: `Python`
    *   **Branch**: `main`
    *   **Root Directory**: Leave blank (root `/`)
    *   **Build Command**:
        ```bash
        pip install -r requirements.txt
        ```
    *   **Start Command**:
        ```bash
        uvicorn backend.main:app --host 0.0.0.0 --port $PORT
        ```
    *   **Instance Type**: `Free`
4.  **Add Environment Variables**:
    *   Click on **Advanced** or navigate to the **Environment** tab on Render.
    *   Add the following key-value pair:
        *   **Key**: `GEMINI_API_KEY`
        *   **Value**: `(Your actual Google Gemini API Key starting with AIza...)`
5.  **Deploy**: Click **Create Web Service**. Render will build the dependencies, mount the FastAPI app, and serve your dashboard live on a public URL!
