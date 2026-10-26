import os
from dotenv import load_dotenv
from pathlib import Path

# =================== Base ===================
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')
# =================== Security ===================
# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')

# เปิด DEBUG เฉพาะเมื่อกำหนด DEBUG=True ใน Environment
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

#กำหนดว่า Host ไหนเข้าถึง Django ได้
ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
    
    'glimmer-grunt-obstruct.ngrok-free.dev',
    "tammara-semivolcanic-randee.ngrok-free.dev",

    "financial-app-xgc0.onrender.com",
    "debtmodule-backend.onrender.com"
]

# =================== LINE ===================

# LINE Messaging API / LINE OA
# LINE Messaging API / LINE OA (ของเดิมจากเพื่อน)
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")

# LINE OA ของเรา (ใช้ค่าของเดิมเป็นตัวสำรอง)
LINE_BOT_CHANNEL_ACCESS_TOKEN = (
    os.getenv("LINE_BOT_CHANNEL_ACCESS_TOKEN")
    or LINE_CHANNEL_ACCESS_TOKEN
)

LINE_BOT_CHANNEL_SECRET = (
    os.getenv("LINE_BOT_CHANNEL_SECRET")
    or LINE_CHANNEL_SECRET
)

# LINE Login
LINE_LOGIN_CHANNEL_ID = os.getenv("LINE_LOGIN_CHANNEL_ID")
LINE_LOGIN_CHANNEL_SECRET = os.getenv("LINE_LOGIN_CHANNEL_SECRET")
LINE_LOGIN_REDIRECT_URI = os.getenv("LINE_LOGIN_REDIRECT_URI")

# รองรับ line_bot/views.py
# LINE_BOT_CHANNEL_ACCESS_TOKEN = LINE_CHANNEL_ACCESS_TOKEN
# LINE_BOT_CHANNEL_SECRET = LINE_CHANNEL_SECRET
# =================== CORS / CSRF ===================
#ส่วนนี้ใช้กับ React ที่เป็นระบบ frontend
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    
    'https://glimmer-grunt-obstruct.ngrok-free.dev',
    'https://tammara-semivolcanic-randee.ngrok-free.dev',

    'https://financial-app-delta-taupe.vercel.app',
    'https://financial-ogk0nhlmw-project-teb-zaaa007.vercel.app'

]
#URL ที่ Django ยอมให้ส่ง POST/CSRF
CSRF_TRUSTED_ORIGINS = [
    'https://rogue-washer-cola.ngrok-free.dev',
    'https://glimmer-grunt-obstruct.ngrok-free.dev',
    'https://tammara-semivolcanic-randee.ngrok-free.dev',

    'https://financial-app-delta-taupe.vercel.app',
    'https://financial-ogk0nhlmw-project-teb-zaaa007.vercel.app'
]

# =================== Frontend URL ===================
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://financial-app-delta-taupe.vercel.app"
    # "https://tammara-semivolcanic-randee.ngrok-free.dev"
)

# =================== Applications ===================
# บอก Django ว่ามี App อะไรบ้าง *สำคัญ*ต้องใส่ App ที่เราสร้างขึ้นเองด้วย
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',

    'users',
    'line_bot',
    'debts',
    'friends',

    'notifications',
    'savings',
    'transactions',
    'categories',

]
# =================== Authentication ===================
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]
# =========================== Django REST Framework ===========================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'users.authentication.LineJWTAuthentication',
    ),
}

# =========================== JWT: JSON WEB TOKEN ===========================
SIMPLE_JWT = {
    'USER_ID_FIELD': 'uid',
    'USER_ID_CLAIM': 'uid',
}

# =========================== Middleware ===========================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',

    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

]


# =========================== URLs / Templates ===========================
ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],  # ถ้าจะใช้ templates ที่สร้างเอง ใส่ BASE_DIR / 'templates'
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# =========================== WSGI ===========================
WSGI_APPLICATION = 'config.wsgi.application'

# =========================== Database ===========================
# https://docs.djangoproject.com/en/6.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
    }
}

# =========================== Password validation ===========================

# https://docs.djangoproject.com/en/6.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# =========================== Internationalization ===================================
# https://docs.djangoproject.com/en/6.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Bangkok'

USE_I18N = True

USE_TZ = True

# =================== Static files (CSS, JavaScript, Images) ===================
# https://docs.djangoproject.com/en/6.1/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# =================== Media files ===================
# ใช้สำหรับรูปใบเสร็จของ Transaction
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# =========================== Email ===========================================
# https://docs.djangoproject.com/en/6.1/topics/email/#topic-email-configuration

MAILERS = {
    'default': {
        'BACKEND': 'django.core.mail.backends.console.EmailBackend',
    },
}

# OCR diagnostics: expose stage timings in Render logs.
# Keep this logger scoped so application-wide logs are not made noisier.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "ocr_console": {
            "format": "%(asctime)s %(levelname)s %(name)s: %(message)s",
        },
    },
    "handlers": {
        "ocr_console": {
            "class": "logging.StreamHandler",
            "formatter": "ocr_console",
        },
    },
    "loggers": {
        "transactions": {
            "handlers": ["ocr_console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

