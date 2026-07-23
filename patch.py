import re
import sys

path = 'mobile/ios/Runner.xcodeproj/project.pbxproj'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add PBXBuildFile
content = content.replace('/* Begin PBXBuildFile section */',
  '/* Begin PBXBuildFile section */\n\t\t1234567890ABCDEF12345678 /* GoogleService-Info.plist in Resources */ = {isa = PBXBuildFile; fileRef = 1234567890ABCDEF12345679 /* GoogleService-Info.plist */; };')

# Add PBXFileReference
content = content.replace('/* Begin PBXFileReference section */',
  '/* Begin PBXFileReference section */\n\t\t1234567890ABCDEF12345679 /* GoogleService-Info.plist */ = {isa = PBXFileReference; fileEncoding = 4; lastKnownFileType = text.plist.xml; path = "GoogleService-Info.plist"; sourceTree = "<group>"; };')

# Add to Runner PBXGroup
runner_group_pattern = r'(97C146F01CF9000F007C117D /\* Runner \*/ = \{\n\s*isa = PBXGroup;\n\s*children = \()'
content = re.sub(runner_group_pattern,
  r'\1\n\t\t\t\t1234567890ABCDEF12345679 /* GoogleService-Info.plist */,', content)

# Add to Resources PBXResourcesBuildPhase
resources_pattern = r'(97C146EC1CF9000F007C117D /\* Resources \*/ = \{\n\s*isa = PBXResourcesBuildPhase;\n\s*buildActionMask = 2147483647;\n\s*files = \()'
content = re.sub(resources_pattern,
  r'\1\n\t\t\t\t1234567890ABCDEF12345678 /* GoogleService-Info.plist in Resources */,', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
