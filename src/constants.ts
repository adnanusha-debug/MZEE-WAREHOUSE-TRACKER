export const PAKISTAN_REGIONS = {
  'Punjab': [
    'Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Bahawalpur', 'Sargodha', 'Gujrat', 'Sheikhupura', 'Jhang', 'Rahim Yar Khan', 'Sahiwal', 'Okara', 'Wah Cantonment', 'Kasur', 'Dera Ghazi Khan', 'Chiniot', 'Hafizabad', 'Kamoke', 'Burewala', 'Jhelum', 'Mandi Bahauddin', 'Khanewal', 'Muridke', 'Muzaffargarh', 'Sadiqabad', 'Taxila', 'Gojra', 'Bahawalnagar', 'Murree', 'Chakwal', 'Talagang', 'Lalamusa', 'Kharian', 'Daska'
  ],
  'Sindh': [
    'Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Mirpur Khas', 'Jacobabad', 'Shikarpur', 'Tando Adam', 'Khairpur', 'Tando Allahyar', 'Dadu', 'Umerkot', 'Kotri', 'Badin', 'Thatta', 'Ghotki'
  ],
  'Khyber Pakhtunkhwa': [
    'Peshawar', 'Mardan', 'Mingora', 'Kohat', 'Abbottabad', 'Mansehra', 'Nowshera', 'Swabi', 'Dera Ismail Khan', 'Charsadda', 'Malakand', 'Havelian', 'Bannu', 'Chitral', 'Timergara'
  ],
  'Balochistan': [
    'Quetta', 'Turbat', 'Khuzdar', 'Hub', 'Chaman', 'Gwadar', 'Sibi', 'Zhob', 'Loralai', 'Nushki'
  ],
  'Azad Kashmir': [
    'Muzaffarabad', 'Mirpur', 'Rawalakot', 'Kotli', 'Bagh', 'Bhimber'
  ],
  'Gilgit-Baltistan': [
    'Gilgit', 'Skardu', 'Chilas', 'Ghunche', 'Astore'
  ],
  'Islamabad Capital Territory': [
    'Islamabad'
  ]
};

export const PAKISTANI_CITIES = Object.values(PAKISTAN_REGIONS).flat().sort();

