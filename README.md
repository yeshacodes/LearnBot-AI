# 🤖 LearnBot — AI Study Assistant

An intelligent study assistant that helps users learn from their own documents using AI-powered search, chat, and flashcards.

---

## 🚀 Overview

LearnBot is a full-stack application that allows users to upload documents and interact with them using natural language.

It uses **Retrieval-Augmented Generation (RAG)** to provide accurate, context-aware answers and generate study materials.

---

## ✨ Features

* 📄 Upload documents (PDFs, notes, etc.)
* 🔍 Semantic search using embeddings
* 💬 Chat with your documents (AI-powered)
* 🧠 Flashcard generation for revision
* ⚡ Fast API responses with optimized backend

---

## 🛠️ Tech Stack

**Frontend:**

* React
* TypeScript

**Backend:**

* FastAPI (Python)

**AI / Data:**

* OpenAI API
* FAISS (vector database)
* Embeddings for semantic search

**Other Tools:**

* Vercel (Frontend Deployment)
* Render (Backend Deployment)

---

## 🧠 How It Works

1. User uploads a document
2. Text is extracted and converted into embeddings
3. Stored in a vector database (FAISS)
4. User asks a question
5. Relevant context is retrieved
6. AI generates a response using that context

---

## 📸 Demo
👉<img width="2859" height="1448" alt="image" src="https://github.com/user-attachments/assets/4b8c4998-f6e4-49c5-9eac-7c5d8e815b43" />

👉<img width="2048" height="1029" alt="image" src="https://github.com/user-attachments/assets/34bbe2ed-31c8-4304-8335-9ecb32aec8ad" />

👉<img width="2048" height="1045" alt="image" src="https://github.com/user-attachments/assets/a825f847-8334-42f8-8325-3fd1e749f8aa" />

👉<img width="2048" height="1036" alt="image" src="https://github.com/user-attachments/assets/6c789bdf-8930-4c10-aaeb-7d8f1c56ef8d" />

👉<img width="2048" height="1043" alt="image" src="https://github.com/user-attachments/assets/955b9d6f-63aa-4b8b-b974-0adbffc74ae3" />

👉<img width="2048" height="1032" alt="image" src="https://github.com/user-attachments/assets/f8452f23-23d2-466f-ac8c-59aa92d30fbf" />E


---

## 🔗 Links

* 🌐 Live App:
* 💻 GitHub Repo: https://github.com/yeshacodes/learnbot-ai

---

## ⚙️ Run Locally

```bash
# Clone the repo
git clone https://github.com/yeshacodes/learnbot-ai

# Install frontend
cd frontend
npm install
npm run dev

# Install backend
cd ../backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 📌 Future Improvements

* User authentication
* Better UI/UX
* Support for more file types
* Improved response accuracy

---

## 👩‍💻 Author

**Yesha Bhavsar**
Computer Science Student @ KSU

```
```
