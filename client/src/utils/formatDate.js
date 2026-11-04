export const formatDateTime = (dateInput) => {
  if (!dateInput) return "---";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "---";

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = `${hours}:${minutes} ${ampm}`;

  return `${day} / ${month} / ${year} (${strTime})`;
};

export const formatDateOnly = (dateInput) => {
  if (!dateInput) return "---";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "---";

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day} / ${month} / ${year}`;
};
