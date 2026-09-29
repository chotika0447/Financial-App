import os
from dotenv import load_dotenv
from pathlib import Path

# =================== Base ===================
BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')
# =================== Security ===================
# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "False") == "True"

#กำหนดว่า Host ไหนเข้าถึง Django ได้
ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
    ".onrender.com",
]

# =================== LINE ===================
LINE_CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")#LINE Messaging API / LINE OA
LINE_CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET")#ตรวจสอบ webhook signature
LINE_LOGIN_CHANNEL_ID = os.getenv("LINE_LOGIN_CHANNEL_ID")#LINE Login

# =================== CORS / CSRF ===================
#ส่วนนี้ใช้กับ React ที่เป็นระบบ frontend
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://financial-app-frontend-o1d7w5dgu-projectzaaa.vercel.app',
]
#URL ที่ Django ยอมให้ส่ง POST/CSRF
CSRF_TRUSTED_ORIGINS = [
    'https://financial-app-frontend-o1d7w5dgu-projectzaaa.vercel.app',
]


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
    'transactions',
    'debts',
    'friends',
    'notifications',
    'savings',
    'line_bot',
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
 
STATIC_URL = 'static/' 

# =========================== Email ===========================================
# https://docs.djangoproject.com/en/6.1/topics/email/#topic-email-configuration

MAILERS = {
    'default': {
        'BACKEND': 'django.core.mail.backends.console.EmailBackend',
    },
}
