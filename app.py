from flask import Flask, render_template, jsonify, request
import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import time
import os

app = Flask(__name__)

# Cache configuration
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300  # 5 minutes in seconds

def parse_entry_content(content_html):
    soup = BeautifulSoup(content_html, 'html.parser')
    h3_tags = soup.find_all('h3')
    
    if not h3_tags:
        item_text = soup.get_text(separator=' ').strip()
        # Clean double newlines
        item_text = "\n".join(line.strip() for line in item_text.splitlines() if line.strip())
        return [{
            'type': 'Update',
            'html': str(soup),
            'text': item_text
        }]
        
    items = []
    current_type = None
    current_html_parts = []
    
    # Iterate over child elements to group them under their respective <h3> headers
    for child in soup.contents:
        if child.name == 'h3':
            if current_type is not None and current_html_parts:
                item_html = "".join(str(x) for x in current_html_parts).strip()
                item_soup = BeautifulSoup(item_html, 'html.parser')
                item_text = item_soup.get_text(separator=' ').strip()
                item_text = "\n".join(line.strip() for line in item_text.splitlines() if line.strip())
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
        item_soup = BeautifulSoup(item_html, 'html.parser')
        item_text = item_soup.get_text(separator=' ').strip()
        item_text = "\n".join(line.strip() for line in item_text.splitlines() if line.strip())
        items.append({
            'type': current_type,
            'html': item_html,
            'text': item_text
        })
        
    return items

def fetch_and_parse_feed():
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BigQueryReleaseNotesViewer/1.0'}
    )
    
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', namespaces)
    
    parsed_items = []
    for entry in entries:
        date = entry.find('atom:title', namespaces)
        date_str = date.text if date is not None else "Unknown Date"
        
        updated = entry.find('atom:updated', namespaces)
        updated_str = updated.text if updated is not None else ""
        
        entry_id = entry.find('atom:id', namespaces)
        entry_id_str = entry_id.text if entry_id is not None else "id"
        
        content = entry.find('atom:content', namespaces)
        content_html = content.text if content is not None else ""
        
        sub_items = parse_entry_content(content_html)
        for idx, sub_item in enumerate(sub_items):
            # Generate a nice slug for linking or identification
            item_id = f"{entry_id_str}#{idx}"
            parsed_items.append({
                'id': item_id,
                'date': date_str,
                'updated': updated_str,
                'type': sub_item['type'],
                'html': sub_item['html'],
                'text': sub_item['text']
            })
            
    return parsed_items

import json

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dod-audit')
def dod_audit():
    return render_template('dod_audit.html')

@app.route('/api/dod-audit')
def get_dod_audit():
    try:
        file_path = os.path.join(app.root_path, 'dod_audit_summary.json')
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify({
            "status": "success",
            "data": data
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    # Return cache if available and not expired/forced
    if not force_refresh and cache["data"] is not None and (now - cache["last_fetched"]) < CACHE_DURATION:
        return jsonify({
            "status": "success",
            "source": "cache",
            "last_fetched": cache["last_fetched"],
            "data": cache["data"]
        })
        
    try:
        data = fetch_and_parse_feed()
        cache["data"] = data
        cache["last_fetched"] = now
        return jsonify({
            "status": "success",
            "source": "live",
            "last_fetched": now,
            "data": data
        })
    except Exception as e:
        # Fallback to cache if request fails
        if cache["data"] is not None:
            return jsonify({
                "status": "partial_success",
                "source": "cache_fallback",
                "error": str(e),
                "last_fetched": cache["last_fetched"],
                "data": cache["data"]
            })
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Make sure templates and static directories exist
    os.makedirs(os.path.join(app.root_path, 'templates'), exist_ok=True)
    os.makedirs(os.path.join(app.root_path, 'static', 'css'), exist_ok=True)
    os.makedirs(os.path.join(app.root_path, 'static', 'js'), exist_ok=True)
    
    app.run(debug=True, host='127.0.0.1', port=5000)
