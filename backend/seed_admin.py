import os
import django

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

def seed_admin():
    User = get_user_model()
    email = "admin@example.com"
    try:
        if not User.objects.filter(email=email).exists():
            user = User.objects.create_superuser(
                email=email,
                password="password123",
                full_name="System Administrator",
                grade_level="16",
                department="CSC HQ",
                mda="Civil Service Commission"
            )
            print(f'>>> Superuser admin ({email}) created successfully!')
        else:
            # Let's ensure the password is set/updated to password123
            user = User.objects.get(email=email)
            user.set_password("password123")
            user.role = "admin"
            user.is_superuser = True
            user.is_staff = True
            user.save()
            print(f'>>> Superuser admin ({email}) already exists. Password & role verified.')
    except Exception as e:
        print('>>> Error seeding superuser admin:', e)

if __name__ == '__main__':
    seed_admin()
