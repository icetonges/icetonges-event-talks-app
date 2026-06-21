import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import json

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_entry_content(content_html):
    soup = BeautifulSoup(content_html, 'html.parser')
    h3_tags = soup.find_all('h3')
    
    if not h3_tags:
        item_text = soup.get_text(separator=' ').strip()
        return [{
            'type': 'Update',
            'html': str(soup),
            'text': item_text
        }]
        
    items = []
    current_type = None
    current_html_parts = []
    
    # We use soup.contents to iterate over children (including NavigableStrings and Elements)
    for child in soup.contents:
        if child.name == 'h3':
            if current_type is not None and current_html_parts:
                item_html = "".join(str(x) for x in current_html_parts).strip()
                # strip html to text for tweeting
                item_text = BeautifulSoup(item_html, 'html.parser').get_text(separator=' ').strip()
                items.append({
                    'type': current_type,
                    'html': item_html,
                    'text': item_text
                })
            current_type = child.get_text().strip()
            current_html_parts = []
        elif current_type is not None:
            current_html_parts.append(child)
            
    if current_type is not None and current_html_parts:
        item_html = "".join(str(x) for x in current_html_parts).strip()
        item_text = BeautifulSoup(item_html, 'html.parser').get_text(separator=' ').strip()
        items.append({
            'type': current_type,
            'html': item_html,
            'text': item_text
        })
        
    return items

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
    
    parsed_items = []
    for entry in entries[:3]:
        date = entry.find('atom:title', namespaces).text
        updated = entry.find('atom:updated', namespaces).text
        entry_id = entry.find('atom:id', namespaces).text
        content_html = entry.find('atom:content', namespaces).text
        
        sub_items = parse_entry_content(content_html)
        for idx, sub_item in enumerate(sub_items):
            parsed_items.append({
                'id': f"{entry_id}#{idx}",
                'date': date,
                'updated': updated,
                'type': sub_item['type'],
                'html': sub_item['html'],
                'text': sub_item['text']
            })

    print(json.dumps(parsed_items[:3], indent=2))
    print(f"\nParsed {len(parsed_items)} sub-items from top 3 entries.")

except Exception as e:
    print("Error:", e)
