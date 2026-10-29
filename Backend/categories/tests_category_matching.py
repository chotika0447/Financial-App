from django.test import TestCase
from categories.models import Category, UserKeyword, Brand
from line.category_matching import match_category
from users.models import User


class CategoryMatchingTests(TestCase):
    def setUp(self):
        # Adjust User creation if the project's custom User requires extra fields.
        self.a = User.objects.create_user(email="a@example.com", password="testpass123")
        self.b = User.objects.create_user(email="b@example.com", password="testpass123")
        self.other = Category.objects.create(name="อื่นๆ", transaction_type="expense")
        self.drink = Category.objects.create(name="เครื่องดื่ม", transaction_type="expense")
        self.game = Category.objects.create(user=self.a, name="เติมเกม", transaction_type="expense")

    def test_private_category_owner_only(self):
        self.assertEqual(match_category("เติมเกม 500 บาท", "expense", self.a), self.game)
        self.assertEqual(match_category("เติมเกม 500 บาท", "expense", self.b), self.other)

    def test_brand(self):
        Brand.objects.create(keyword="jiancha", category=self.drink, transaction_type="expense")
        self.assertEqual(match_category("jiancha 80 บาท", "expense", self.a), self.drink)

    def test_user_keyword_is_private(self):
        UserKeyword.objects.create(user=self.a, keyword="valorant", category=self.game, transaction_type="expense")
        self.assertEqual(match_category("valorant 500", "expense", self.a), self.game)
        self.assertEqual(match_category("valorant 500", "expense", self.b), self.other)
