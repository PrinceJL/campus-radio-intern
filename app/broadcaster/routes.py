from flask import Blueprint, render_template

broadcaster_bp = Blueprint(
    'broadcaster', __name__,
    static_folder='static',
    template_folder='templates'
)

@broadcaster_bp.route('/')
def broadcaster_home():
    return render_template('broadcaster.html')
