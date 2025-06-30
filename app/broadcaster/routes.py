from flask import Blueprint, render_template

broadcaster_bp = Blueprint(
    'broadcaster', __name__,
    static_folder='static',
    static_url_path='/static',
    template_folder='templates'
)


@broadcaster_bp.route('/')
def broadcaster_home():
    return render_template('broadcaster.html')

@broadcaster_bp.route('/login')
def broadcaster_render():
    return render_template('login.html')

