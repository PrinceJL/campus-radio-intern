# Revamp Campus Radio

Revamp Campus Radio is a **self-hosted campus broadcasting platform** designed for secure, internal streaming.

---

## 🚀 Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/revamp-campus-radio.git
   cd revamp-campus-radio
   ```

2. **Create a `.env` file** in the project root:

   ```env
   ADMIN_EMAIL=example@example.com
   ADMIN_PASSWORD=examplePassword
   ADMIN_NAME=Example
   ```

3. ## 🔒 Generate SSL Certificate (with SAN)

A sample `san.cnf` file is provided in the project root for generating a self-signed SSL certificate with Subject Alternative Names (SAN):

To generate the certificate using this config, run:

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout nginx/ssl/server.key \
  -out nginx/ssl/server.crt \
  -config san.cnf
```

4. **Run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

---

## 🛠️ Troubleshooting

If the `entrypoint.sh` script does not work due to permission issues, provide the necessary permission by running:

```bash
chmod +x entrypoint.sh
```

inside your Ubuntu terminal.

---

## 📋 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed
- Basic knowledge of Linux server administration
- Access to a terminal with OpenSSL installed

---

## 📂 Directory Structure

```
.
├── app/                # Application source code
├── nginx/ssl/          # SSL certificate and key storage
├── docker-compose.yml  # Docker service definitions
├── .env                # Environment variables
└── README.md           # Project documentation
```

---

Docker will automatically generate the secret key.
