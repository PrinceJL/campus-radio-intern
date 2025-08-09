# 🎙️ Revamp Campus Radio

A self-hosted campus radio streaming system designed for internal network broadcasting.  
The project uses Docker for deployment, supports HTTPS with self-signed certificates, and includes both frontend and backend components.

---

## 📂 Environment Setup

Before running the project, create a `.env` file in the project root with the following content:

```env
ADMIN_EMAIL=example@example.com
ADMIN_PASSWORD=examplePassword
ADMIN_NAME=Example
```

> **Note:**
>
> * The `.env` file in this repository is for **transfer purposes only**.
> * You **must** replace these values with your own before deployment.
> * Docker will automatically generate the secret key for the application.

---

## 🔒 Generate SSL Certificate (with SAN)

A sample `san.cnf` file is included in the project root for generating a self-signed SSL certificate with Subject Alternative Names (SAN):

To generate the certificate using this config:

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout nginx/ssl/server.key \
  -out nginx/ssl/server.crt \
  -config san.cnf
```

Place the generated files inside `nginx/ssl/`.

---

## 🐳 Running with Docker

```bash
docker-compose up --build
```

This will start the backend, frontend, and NGINX reverse proxy with HTTPS enabled.

---

## 🛠️ Troubleshooting

If the `entrypoint.sh` script does not work due to permission issues, provide the necessary permission by running:

```bash
chmod +x entrypoint.sh
```

inside your Ubuntu terminal.

---

## 💻 Technologies Used

* **Frontend**: HTML5, JavaScript (Waveform Visualizer, Audio Controls)
* **Backend**: Flask (Python)
* **Database**: MongoDB
* **Deployment**: Docker & Docker Compose
* **Web Server**: NGINX (Reverse Proxy, SSL Termination)
* **Audio Processing**: HTML5 Audio API, Web Audio API
* **Other Tools**:
  * Google Workspace (documentation, communication, file sharing)
  * ChatGPT (software development assistance)

---

## 📂 Directory Structure

```
.
├── app/                # Application source code
├── nginx/ssl/          # SSL certificate and key storage
├── docker-compose.yml  # Docker service definitions
├── .env                # Environment variables
├── san.cnf             # SSL SAN configuration
└── README.md           # Project documentation
```

---

## ⚠️ Notes

* The `.env` file and SSL certificates provided in this repository are **for testing only**.
* Always generate your own secure credentials before deploying to a production environment.
* This system is designed for **internal network streaming** — not intended for public internet broadcasting without proper licensing.

---