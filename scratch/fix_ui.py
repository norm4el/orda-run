import os, glob

dart_files = glob.glob('mobile/lib/**/*.dart', recursive=True)
for f in dart_files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = content.replace(r'\${', '${')
    new_content = new_content.replace('0xFFD8A760', '0xFFF5D142')
    
    if content != new_content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f'Updated {f}')
