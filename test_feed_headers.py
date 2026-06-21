import urllib.request
import xml.etree.ElementTree as ET
import re

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
    
    multi_header_count = 0
    for entry in entries:
        title = entry.find('atom:title', namespaces).text
        content = entry.find('atom:content', namespaces).text
        
        # Count <h3> tags
        h3_tags = re.findall(r'<h3[^>]*>(.*?)</h3>', content, re.IGNORECASE)
        if len(h3_tags) > 1:
            multi_header_count += 1
            print(f"Date: {title} has {len(h3_tags)} updates: {h3_tags}")

    print(f"\nTotal entries: {len(entries)}")
    print(f"Entries with multiple headers: {multi_header_count}")

except Exception as e:
    print("Error:", e)
