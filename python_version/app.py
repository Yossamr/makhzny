import os
import sqlite3
import pandas as pd
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
DB_FILE = 'clinic_data.db'

# Initialize Database
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS drugs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch TEXT NOT NULL,
            clinic_name TEXT NOT NULL,
            drug_name TEXT NOT NULL,
            unit TEXT NOT NULL,
            unit_price REAL NOT NULL,
            quantity REAL NOT NULL,
            total REAL NOT NULL,
            ticket_date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/drugs/search', methods=['GET'])
def search_drugs():
    q = request.args.get('q', '')
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT name FROM drugs WHERE name LIKE ? LIMIT 20", ('%' + q + '%',))
    drugs = [row[0] for row in c.fetchall()]
    conn.close()
    return jsonify(drugs)

@app.route('/api/drugs/import', methods=['POST'])
def import_drugs():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        df = pd.read_excel(file)
        # Assuming the first column has the drug names
        drug_names = df.iloc[:, 0].dropna().astype(str).tolist()
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        added_count = 0
        for name in drug_names:
            try:
                c.execute("INSERT INTO drugs (name) VALUES (?)", (name.strip(),))
                added_count += 1
            except sqlite3.IntegrityError:
                pass # Ignore duplicates
        conn.commit()
        conn.close()
        return jsonify({'message': f'Successfully imported {added_count} new drugs.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/records', methods=['POST'])
def add_record():
    data = request.json
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        
        # Add drug to drugs table if it doesn't exist
        try:
            c.execute("INSERT INTO drugs (name) VALUES (?)", (data['drug_name'].strip(),))
        except sqlite3.IntegrityError:
            pass
            
        c.execute('''
            INSERT INTO records (branch, clinic_name, drug_name, unit, unit_price, quantity, total, ticket_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['branch'], data['clinic_name'], data['drug_name'].strip(),
            data['unit'], data['unit_price'], data['quantity'],
            data['total'], data['ticket_date']
        ))
        conn.commit()
        record_id = c.lastrowid
        conn.close()
        return jsonify({'message': 'Record saved successfully', 'id': record_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/records', methods=['GET'])
def get_records():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM records ORDER BY id DESC")
    records = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(records)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
