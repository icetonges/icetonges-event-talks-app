import urllib.request
import xml.etree.ElementTree as ET

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

try:
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', namespaces)
    
    for i, entry in enumerate(entries[:2]):
        title = entry.find('atom:title', namespaces).text
        content = entry.find('atom:content', namespaces).text
        print(f"\n=================== ENTRY {i+1}: {title} ===================")
        print(content)

except Exception as e:
    print("Error:", e)
