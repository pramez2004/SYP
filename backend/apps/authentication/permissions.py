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


class IsShopOwner(BasePermission):
    """
    Object-level permission: allow only if the requesting user
    owns the shop that the object belongs to.
    Works on objects with a `shop.owner` or direct `owner` attribute.
    """

    message = 'You can only manage your own shop resources.'

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'shop'):
            return obj.shop.owner == request.user
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        return False
