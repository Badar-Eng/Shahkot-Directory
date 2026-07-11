fetch("../data/shops.json")

    .then(res => res.json())

    .then(data => {

        let html = "";

        data.forEach(shop => {

            html += `

<div class="shop-card">

<img src="${shop.cardImage}">

<h2>${shop.name}</h2>

<p>

${shop.category}

</p>

<p>

${shop.phone}

</p>

<button>Edit</button>

<button>Delete</button>

</div>

`;

        });

        document.getElementById("shopContainer").innerHTML = html;

    });