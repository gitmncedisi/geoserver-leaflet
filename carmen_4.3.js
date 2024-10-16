// Select DOM elements
const coordinateCheckbox = document.getElementById('coordinate-checkbox');
const addressCheckbox = document.getElementById('address-checkbox');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const addressInput = document.getElementById('address');
const searchBtn = document.getElementById('searchBtn');
const mediumSelect = document.getElementById('medium');

// Handle enabling/disabling coordinate inputs and address input based on checkboxes
coordinateCheckbox.addEventListener('change', function() {
    toggleInputs(coordinateCheckbox.checked, 'coordinates');
});

addressCheckbox.addEventListener('change', function() {
    toggleInputs(addressCheckbox.checked, 'address');
});

/**
 * Function to toggle input fields based on the selected search method.
 * @param {boolean} isChecked - Whether the checkbox is checked.
 * @param {string} type - 'coordinates' or 'address'.
 */
function toggleInputs(isChecked, type) {
    if (type === 'coordinates') {
        latitudeInput.disabled = !isChecked;
        longitudeInput.disabled = !isChecked;
        addressInput.disabled = isChecked;
    } else if (type === 'address') {
        addressInput.disabled = !isChecked;
        latitudeInput.disabled = isChecked;
        longitudeInput.disabled = isChecked;
    }
    validateInputs();
}

/**
 * Function to validate if any required inputs are filled before enabling the search button.
 */
function validateInputs() {
    if ((coordinateCheckbox.checked && latitudeInput.value && longitudeInput.value) ||
        (addressCheckbox.checked && addressInput.value)) {
        searchBtn.disabled = false; // Enable button when inputs are filled
    } else {
        searchBtn.disabled = true; // Disable button when inputs are empty
    }
}

// Check for input changes and validate to enable the search button
latitudeInput.addEventListener('input', validateInputs);
longitudeInput.addEventListener('input', validateInputs);
addressInput.addEventListener('input', validateInputs);

// Event listener for the search button
searchBtn.addEventListener('click', function() {
    const selectedMediums = Array.from(mediumSelect.selectedOptions).map(option => option.value);

    // Validate coordinates input
    if (coordinateCheckbox.checked) {
        const latitude = parseFloat(latitudeInput.value);
        const longitude = parseFloat(longitudeInput.value);

        if (isNaN(latitude) || isNaN(longitude)) {
            alert('Please enter valid latitude and longitude.');
            return;
        }

        if (selectedMediums.length === 0) {
            alert('Please select at least one connection medium.');
            return;
        }

        // Proceed with coordinate-based coverage search
        searchCoverage(latitude, longitude, null, selectedMediums);
    }

    // Validate address input
    else if (addressCheckbox.checked) {
        const address = addressInput.value.trim();

        if (!address) {
            alert('Please enter a valid address.');
            return;
        }

        // Proceed with address-based coverage search
        searchCoverage(null, null, address, selectedMediums);
    }
});

/**
 * Function to handle the coverage search request (coordinates or address).
 * @param {number|null} lat - Latitude.
 * @param {number|null} lng - Longitude.
 * @param {string|null} address - Address.
 * @param {array} selectedMediums - Array of selected mediums.
 */
async function searchCoverage(lat, lng, address, selectedMediums) {
    try {
        const response = await fetch('/check-coverage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lng, address, mediums: selectedMediums })
        });

        const data = await response.json();
        document.getElementById('result').innerText = data.message;

        if (data.message.includes('covered')) {
            openProductCatalogPage(data.providers); // Navigate to product catalog page if coverage found
        } else {
            document.getElementById('providers').innerHTML = '';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('result').innerText = 'Error checking coverage.';
    }
}

/**
 * Function to navigate to a new page displaying the product catalog if coverage is found.
 * @param {array} providers - Array of provider objects with details.
 */
function openProductCatalogPage(providers) {
    // Assuming you will generate a new page using the same HTML structure and dynamically load the catalog
    const newWindow = window.open("", "_blank"); // Open a new blank window
    newWindow.document.write(`
        <html>
        <head><title>Product Catalog</title></head>
        <body>
            <h2>Product Catalog</h2>
            <table>
                <thead>
                    <tr><th>Provider</th><th>Product</th></tr>
                </thead>
                <tbody>
                    ${providers.map(provider => `
                        <tr><td>${provider.provider}</td><td>${provider.product}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `);
}
