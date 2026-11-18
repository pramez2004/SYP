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


class IsVerifiedShopSeller(BasePermission):
    """Allow access only to sellers with an active, verified shop."""

    message = 'Only sellers with an active, verified shop can perform this action.'

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role == 'seller'):
            return False
        from apps.marketplace.models import Shop
        return Shop.objects.filter(owner=request.user, is_verified=True, is_active=True).exists()


class IsShopOwner(BasePermission):
    """
    Object-level permission: allow only if the requesting user
    owns the shop that the object belongs to.
    Works on objects with a `shop.owner` or direct `owner` attribute.
    """

    message = 'You can only manage your own shop resources.'

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff or getattr(request.user, 'role', '') == 'admin':
            return True
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        if hasattr(obj, 'shop'):
            return obj.shop.owner == request.user
        return False
