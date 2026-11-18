# Chaad Baad (चाडबाड) 🪔

A bilingual (Nepali / English) platform connecting Nepali festival knowledge (dates, ritual guides, puja checklists) with local marketplace ordering (Damak, Birtamod, Itahari). Payment is **Cash on Delivery (COD)** only.

Built as a Second Year Project (SYP).

---

## Tech Stack

- **Backend:** Django 5, Django REST Framework (DRF), SimpleJWT, PostgreSQL, drf-spectacular (Swagger / OpenAPI)
- **Mobile:** Expo React Native, TypeScript, React Navigation, Axios, AsyncStorage
- **Infrastructure:** Docker Compose (PostgreSQL)

---

## Folder Structure

```text
SYP/
├── docker-compose.yml          # PostgreSQL container definition
├── README.md                   # Project documentation
├── backend/                    # Django REST API backend
│   ├── manage.py
│   ├── requirements.txt        # Python package dependencies
│   ├── .env.example            # Template for environment variables
│   ├── config/                 # Core Django configuration & routing
│   │   ├── settings.py         # Main development/production settings
│   │   ├── settings_test.py    # In-memory SQLite settings for fast test runs
│   │   ├── urls.py             # Root URL router
│   │   ├── wsgi.py
│   │   └── asgi.py
│   └── apps/                   # Django applications
│       ├── authentication/     # Custom User model, JWT login/logout, password change
│       ├── festivals/          # Festival dates, ritual steps, puja checklist, seed data
│       ├── marketplace/        # Categories, shops, products, verification
│       └── orders/             # Shopping cart, checkout, status progression, cancellation
└── mobile/                     # Expo React Native mobile application
    ├── App.tsx                 # Root application component
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── constants/          # API URLs, theme colors, config
        ├── context/            # AuthContext, LanguageContext
        ├── i18n/               # Bilingual dictionary (English & Nepali)
        ├── screens/            # Home, Calendar, Marketplace, Orders screens
        └── services/           # Axios apiClient with JWT refresh interceptors
```

---

## Backend Setup Guide

### 1. Start PostgreSQL with Docker

```bash
docker compose up -d
```

### 2. Set Up Python Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Ensure the credentials in `.env` match your local or Docker PostgreSQL container:

```env
DB_NAME=chaadbaad
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

### 4. Run Migrations

```bash
python manage.py migrate
```

### 5. Seed Database

Populate festivals, ritual steps, puja checklists, categories, verified shops, and sample products:

```bash
python manage.py seed_data
```

*(This command is idempotent and safe to run multiple times).*

### 6. Start the Backend Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/`.
- **Swagger Documentation:** `http://localhost:8000/api/docs/`
- **ReDoc Documentation:** `http://localhost:8000/api/redoc/`
- **Django Admin:** `http://localhost:8000/admin/`

### 7. Run Automated Tests

Run the test suite using in-memory SQLite (no PostgreSQL needed for tests):

```bash
python manage.py test --settings=config.settings_test
```

---

## Mobile Setup Guide

```bash
cd mobile
npm install
npx expo start
```

Press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code with the Expo Go app on your physical mobile phone.

> **Note for Physical Devices / Emulators:**
> Update `API_BASE_URL` in `mobile/src/constants/config.ts` or set `EXPO_PUBLIC_API_URL` to your machine's LAN IP (e.g. `http://192.168.1.100:8000`), or `http://10.0.2.2:8000` for Android Emulator.

---

## Seed Test Accounts

The `python manage.py seed_data` command provides pre-configured test users:

| Username | Password | Role | City | Description |
|---|---|---|---|---|
| `customer1` | `testpass123` | Customer | Damak | Sample customer with test profile |
| `seller_damak` | `testpass123` | Seller | Damak | Owner of "Puja Store Damak" |
| `seller_birtamod` | `testpass123` | Seller | Birtamod | Owner of "Mandala Puja House" |
| `seller_itahari` | `testpass123` | Seller | Itahari | Owner of "Om Puja Saman" |

To create a superuser for the Django admin:

```bash
python manage.py createsuperuser
```

---

## API Endpoints Reference

### Authentication & Profile (`/api/auth/` and `/api/token/`)

| Method | Endpoint | Purpose | Access Control |
|---|---|---|---|
| `POST` | `/api/token/` | Obtain JWT access and refresh token pair | Public (Throttled: 5/min) |
| `POST` | `/api/token/refresh/` | Refresh expired access token | Public (Requires refresh token) |
| `POST` | `/api/auth/register/` | Register new customer or seller | Public (customer/seller only) |
| `POST` | `/api/auth/logout/` | Blacklist refresh token server-side | Authenticated |
| `GET` | `/api/auth/profile/` | View current user profile | Authenticated |
| `PATCH` | `/api/auth/profile/` | Update profile information | Authenticated |
| `POST` | `/api/auth/change-password/` | Change account password | Authenticated |

### Festivals (`/api/festivals/`)

| Method | Endpoint | Purpose | Access Control |
|---|---|---|---|
| `GET` | `/api/festivals/` | List all festivals | Public |
| `GET` | `/api/festivals/{slug}/` | Festival detail (ritual steps + puja items) | Public |
| `GET` | `/api/festivals/upcoming/` | Upcoming festivals from today | Public |
| `GET` | `/api/festivals/today/` | Today's active festival(s) | Public |
| `GET` | `/api/festivals/calendar/?year=YYYY` | Festival dates by Gregorian year | Public |

### Marketplace (`/api/marketplace/`)

| Method | Endpoint | Purpose | Access Control |
|---|---|---|---|
| `GET` | `/api/marketplace/categories/` | List product categories | Public |
| `GET` | `/api/marketplace/shops/` | List active shops | Public |
| `GET` | `/api/marketplace/shops/{id}/` | Shop detail with listed products | Public |
| `POST` | `/api/marketplace/shops/` | Create a shop (`is_verified=False`) | Seller only |
| `PATCH` | `/api/marketplace/shops/{id}/` | Update shop details | Shop owner only |
| `DELETE` | `/api/marketplace/shops/{id}/` | Delete shop | Shop owner only |
| `GET` | `/api/marketplace/products/` | List products from verified active shops | Public |
| `GET` | `/api/marketplace/products/{id}/` | Product detail | Public |
| `POST` | `/api/marketplace/products/` | Create product | Verified active seller only |
| `PATCH` | `/api/marketplace/products/{id}/` | Update product | Shop owner only |
| `DELETE` | `/api/marketplace/products/{id}/` | Delete product | Shop owner only |

### Orders & Cart (`/api/orders/`)

| Method | Endpoint | Purpose | Access Control |
|---|---|---|---|
| `GET` | `/api/orders/cart/` | View current user's cart | Authenticated |
| `POST` | `/api/orders/cart/` | Add or update cart item | Authenticated |
| `DELETE` | `/api/orders/cart/{id}/` | Remove item from cart | Authenticated |
| `DELETE` | `/api/orders/cart/clear/` | Empty cart | Authenticated |
| `POST` | `/api/orders/cart/checkout/` | Checkout cart into COD orders grouped by shop | Authenticated |
| `GET` | `/api/orders/` | List orders (customer: own; seller: shop's) | Authenticated |
| `GET` | `/api/orders/{id}/` | Order detail | Customer or Shop owner |
| `POST` | `/api/orders/{id}/update_status/` | Forward status progression or cancel | Shop owner only |
| `POST` | `/api/orders/{id}/cancel/` | Cancel order while status is `placed` | Customer only |

### Order Status Progression Rules

```text
placed  ──>  confirmed  ──>  packed  ──>  out_for_delivery  ──>  delivered
   │             │
   ▼             ▼
cancelled    cancelled
```
- **Forward only:** skipping states or going backwards returns `400 Bad Request`.
- **Seller rejection:** seller can cancel only from `placed` or `confirmed`.
- **Customer cancellation:** customer can cancel their own order only while status is `placed`.
- **Stock restoration:** any cancellation restores the reserved product stock atomically.
- **Delivery & Payment:** transitioning to `delivered` automatically sets `delivered_at` timestamp and marks `is_paid = True` (Cash on delivery).
