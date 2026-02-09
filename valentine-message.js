// Image paths
const images = [
    "lego-1.jpg",
    "lego-2.jpg",
    "lego-3.jpg",
    "lego-5.png",
    "VintagE.jpeg"
];

const container = document.getElementById("valentines-container");
let lastIndex = -1;

function showNewCard() {
    if (images.length === 0) return;

    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * images.length);
    } while (newIndex === lastIndex && images.length > 1);

    lastIndex = newIndex;
    const randomImage = images[newIndex];

    const imageHTML = `<img src="${randomImage}" alt="Valentine Card" class="card-image">`;

    if (container) {
        container.innerHTML = imageHTML;
    }
}

showNewCard();

if (container) {
    container.addEventListener('click', () => {
        showNewCard();
    });
}