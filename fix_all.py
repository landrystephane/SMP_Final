import os

def fix_readme():
    content = """# Eco-Manage
Système de gestion scolaire intégré pour établissements bilingues.

## Installation
1. CD eco-manage
2. npm install
3. npm run build
4. npm start

## Identifiants de test
- Admin: admin / admin
- Teacher: teacher / teacher
"""
    with open('README.md', 'w') as f:
        f.write(content)

def cleanup():
    files_to_delete = [
        'debug_fix_error.png',
        'dev_server.log',
        'server.log',
        'verify_fix.py',
        'verify_final.spec.ts',
        'verify_pfe.spec.ts',
        'verify_translations.spec.ts',
        'dashboard_success.png'
    ]
    for f in files_to_delete:
        if os.path.exists(f):
            os.remove(f)
            print(f"Deleted {f}")

if __name__ == "__main__":
    fix_readme()
    cleanup()
