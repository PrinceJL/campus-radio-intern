from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from db import users_collection

auth_bp = Blueprint('auth', __name__)

# ------------------------
# LOGIN ROUTE
# ------------------------
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    Handle user login. Validates credentials against MongoDB.
    """
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = users_collection.find_one({'email': email})
        if user and check_password_hash(user['password'], password):
            session['user'] = str(user['_id'])
            session['email'] = user['email']
            session['name'] = user.get('name', '')
            return redirect(url_for('broadcaster.broadcaster_home'))
        else:
            flash('Invalid email or password', 'danger')
            return redirect(url_for('auth.login'))

    return render_template('login.html')

@auth_bp.route('/users')
def view_all_users():
    users = list(users_collection.find({}))
    users = [{**u, '_id': str(u['_id'])} for u in users]
    return jsonify(users)



# ------------------------
# LOGOUT ROUTE
# ------------------------
@auth_bp.route('/logout')
def logout():
    """
    Clears session and redirects to login page.
    """
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))


# ------------------------
# REQUIRE LOGIN DECORATOR
# ------------------------
def login_required(view_function):
    """
    Protect routes by requiring user login.
    Usage:
        @app.route('/secret')
        @require_login
        def secret(): ...
    """
    @wraps(view_function)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            flash('Please log in to continue.', 'warning')
            return redirect(url_for('auth.login'))
        return view_function(*args, **kwargs)
    return decorated_function


# ------------------------
# OPTIONAL: REGISTER ROUTE (Remove after seeding)
# ------------------------
@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """
    Temporary route to register new users. POST with email, password, and optional name.
    """
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        name = request.form.get('name', '')

        if not email or not password:
            return {"success": False, "message": "Email and password are required."}, 400

        if users_collection.find_one({'email': email}):
            return {"success": False, "message": "Email already registered."}, 409

        hashed_pw = generate_password_hash(password)
        users_collection.insert_one({
            'email': email,
            'password': hashed_pw,
            'name': name,
        })

        return {"success": True, "message": "Account created. You can now log in."}, 201

    return render_template('register.html')

