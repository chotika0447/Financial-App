from unittest.mock import Mock, patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import PersonalProfile, User


@override_settings(LINE_LOGIN_CHANNEL_ID='line-channel-id')
class LineRegisterTests(TestCase):

	def setUp(self):
		self.client = APIClient()

	@patch('users.views.requests.post')
	def test_registers_verified_line_user_and_returns_profile(self, post):
		verification = Mock(status_code=200)
		verification.json.return_value = {
			'sub': 'line-user-123',
			'name': 'LINE Member',
			'picture': 'https://example.com/avatar.png',
		}
		post.return_value = verification

		response = self.client.post('/users/line-register/', {
			'id_token': 'valid-id-token',
			'age': 29,
			'occupation': 'Designer',
			'monthly_income': '42000.00',
		}, format='json')

		self.assertEqual(response.status_code, 201)
		user = User.objects.get(line_uid='line-user-123')
		self.assertEqual(user.username, 'LINE Member')
		self.assertIsNone(user.email)
		self.assertFalse(user.has_usable_password())
		self.assertEqual(
			PersonalProfile.objects.get(user=user).profile_img,
			'https://example.com/avatar.png',
		)

		self.client.credentials(
			HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
		)
		profile_response = self.client.get('/users/me/')
		self.assertEqual(profile_response.data['profile_img'], 'https://example.com/avatar.png')
		self.assertEqual(profile_response.data['age'], 29)
		self.assertEqual(profile_response.data['occupation'], 'Designer')
		self.assertEqual(profile_response.data['monthly_income'], '42000.00')

		update_response = self.client.patch('/users/me/', {
			'age': 30,
			'occupation': 'Product Designer',
			'monthly_income': '50000.00',
		}, format='json')
		self.assertEqual(update_response.status_code, 200)
		self.assertEqual(update_response.data['age'], 30)
		self.assertEqual(update_response.data['occupation'], 'Product Designer')
		self.assertEqual(update_response.data['monthly_income'], '50000.00')

	@patch('users.views.requests.post')
	def test_registration_requires_valid_profile_details(self, post):
		verification = Mock(status_code=200)
		verification.json.return_value = {'sub': 'line-user-456'}
		post.return_value = verification

		response = self.client.post('/users/line-register/', {
			'id_token': 'valid-id-token',
			'age': 0,
			'occupation': '   ',
			'monthly_income': '-1',
		}, format='json')

		self.assertEqual(response.status_code, 400)
		self.assertFalse(User.objects.filter(line_uid='line-user-456').exists())

	@patch('users.views.requests.post')
	def test_rejects_invalid_line_token(self, post):
		post.return_value = Mock(status_code=400)

		response = self.client.post('/users/line-register/', {
			'id_token': 'invalid-id-token',
		}, format='json')

		self.assertEqual(response.status_code, 401)
		self.assertEqual(User.objects.count(), 0)

	@patch('users.views.requests.post')
	def test_line_login_returns_tokens_for_existing_user(self, post):
		verification = Mock(status_code=200)
		verification.json.return_value = {'sub': 'line-user-123'}
		post.return_value = verification
		User.objects.create_user(
			email=None,
			username='LINE Member',
			line_uid='line-user-123',
		)

		response = self.client.post('/users/line-login/', {
			'id_token': 'valid-id-token',
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertIn('access', response.data)
		self.assertIn('refresh', response.data)

	@patch('users.views.requests.post')
	def test_line_login_sends_unregistered_user_to_register(self, post):
		verification = Mock(status_code=200)
		verification.json.return_value = {'sub': 'new-line-user'}
		post.return_value = verification

		response = self.client.post('/users/line-login/', {
			'id_token': 'valid-id-token',
		}, format='json')

		self.assertEqual(response.status_code, 404)

	def test_legacy_email_password_endpoints_are_removed(self):
		register_response = self.client.post('/users/register/', {}, format='json')
		login_response = self.client.post('/users/login/', {}, format='json')

		self.assertEqual(register_response.status_code, 404)
		self.assertEqual(login_response.status_code, 404)
