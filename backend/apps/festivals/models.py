from django.db import models


class Festival(models.Model):
    """
    A Nepali festival / चाडपर्व.
    Stores bilingual info, date, and significance.
    """

    name_en = models.CharField(max_length=200)
    name_ne = models.CharField(max_length=200)  # Nepali name, e.g. 'दशैँ'
    slug = models.SlugField(unique=True)

    description_en = models.TextField(blank=True)
    description_ne = models.TextField(blank=True)

    significance_en = models.TextField(blank=True)
    significance_ne = models.TextField(blank=True)

    # Date fields (Gregorian — for the current year)
    date_start = models.DateField()
    date_end = models.DateField(blank=True, null=True)  # Multi-day festivals

    # Nepali calendar date (for display only)
    nepali_date = models.CharField(max_length=100, blank=True)

    image = models.ImageField(upload_to='festivals/', blank=True, null=True)
    banner = models.ImageField(upload_to='festivals/banners/', blank=True, null=True)

    is_national_holiday = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date_start']

    def __str__(self):
        return f"{self.name_en} / {self.name_ne}"


class RitualStep(models.Model):
    """
    A step in the puja / ritual process for a festival.
    """

    festival = models.ForeignKey(
        Festival, on_delete=models.CASCADE, related_name='ritual_steps'
    )
    order = models.PositiveIntegerField()
    title_en = models.CharField(max_length=200)
    title_ne = models.CharField(max_length=200)
    description_en = models.TextField(blank=True)
    description_ne = models.TextField(blank=True)
    image = models.ImageField(upload_to='rituals/', blank=True, null=True)

    class Meta:
        ordering = ['festival', 'order']
        unique_together = ['festival', 'order']

    def __str__(self):
        return f"{self.festival.name_en} — Step {self.order}: {self.title_en}"


class PujaItem(models.Model):
    """
    An item needed for a festival's puja checklist.
    Links festivals to marketplace products.
    """

    festival = models.ForeignKey(
        Festival, on_delete=models.CASCADE, related_name='puja_items'
    )
    name_en = models.CharField(max_length=200)
    name_ne = models.CharField(max_length=200)
    quantity = models.CharField(max_length=50, blank=True)  # e.g., "1 bundle", "5 pieces"
    is_essential = models.BooleanField(default=True)

    # Optional link to a marketplace product
    product = models.ForeignKey(
        'marketplace.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='puja_items',
    )

    class Meta:
        ordering = ['-is_essential', 'name_en']

    def __str__(self):
        return f"{self.name_en} for {self.festival.name_en}"
