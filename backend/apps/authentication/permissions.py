from rest_framework.permissions import BasePermission


class IsSeller(BasePermission):
    """Allow access only to users with the 'seller' role."""

    message = 'Only sellers can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'seller'
        )


class IsCustomer(BasePermission):
    """Allow access only to users with the 'customer' role."""

    message = 'Only customers can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'customer'
        )


class IsAdminUser(BasePermission):
    """Allow access only to users with the 'admin' role."""

    message = 'Only admins can perform this action.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


# Role -> what that role can do in the authentication module.
# Returned by GET /api/auth/permissions/ so a client can show/hide features.
ROLE_PERMISSIONS = {
    'customer': ['profile.view', 'profile.update', 'password.change'],
    'seller': ['profile.view', 'profile.update', 'password.change'],
    'admin': [
        'profile.view', 'profile.update', 'password.change',
        'users.list', 'users.view', 'users.change_role', 'users.deactivate',
    ],
}
