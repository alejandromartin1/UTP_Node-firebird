"use strict";

const loader = document.getElementById("preloader");
const container = document.getElementById("container");
const table = document.getElementById("table-container");
const inputSearch = document.getElementById("buscar");
const formInput = document.getElementById("formInput");

let limit = 20;
let skip = 0;
let search = "";

// Hace que no se refresque la pagina en el input de busqueda
formInput.addEventListener("submit", e => e.preventDefault());

// Funcion para la animacion de carga
const changeView = () => {
  loader.style.display = "block";
  container.classList.add("d-none");

  setTimeout(() => {
    loader.style.display = "none";
    container.classList.remove("d-none");
  }, 200);
};

const prev = () => {
  if (skip >= limit) {
    skip -= limit;
    getGrupos();
  }
};

const next = () => {
  skip += limit;
  getGrupos();
};

// uncion para buscar por codigo del grupo
const searchGrupo = () => {
  search = inputSearch.value
  skip = 0;
  getGrupos();
}

// Hace la llamada a la API
const getGrupos = async () => {
  const res = await fetch(`api/grupos?limit=${limit}&skip=${skip}&search=${search}`);
  const { grupos } = await res.json();

  // Vacia la tabla en caso que ya tenga datos
  table.innerHTML = "";

  let content = "";
  grupos.map((item, i) => {
    content += `<tr onclick="window.location.href='/grupos/${item.CODIGO_GRUPO}'">`;
    content += `<td>${i + 1}</td>`;
    content += `<td>${item.NIVEL}</td>`;
    content += `<td>${item.CODIGO_GRUPO}</td>`;
    content += `<td>${item.PERIODO}</td>`;
    content += `<td>${item.GRADO}</td>`;
    content += `<td>${item.GRUPO}</td>`;
    content += `<td>${item.INSCRITOS} de ${item.CUPO_MAXIMO}</td>`;
    content += `<td>${item.CLAVEPROFESOR_TITULAR}</td>`;
    content += "</tr>";
  });

  table.innerHTML = content;

  changeView();
};

getGrupos();
