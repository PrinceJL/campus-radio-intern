from flask import Blueprint, render_template

viewer_bp = Blueprint(
    'viewer', __name__,
    static_folder='static',
    template_folder='templates'
)

@viewer_bp.route('/')
def viewer_home():
    return render_template('viewer.html')