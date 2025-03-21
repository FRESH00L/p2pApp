document.addEventListener("DOMContentLoaded", function () {
    const proceedButton = document.getElementById("proceedButton");
    if (proceedButton) {
        proceedButton.addEventListener("click", function () {
            let password = prompt("Enter your password to confirm the transaction:");
            if (!password) {
                alert("Transaction canceled. Password is required.");
                return;
            }

            // Wstawiamy hasło do ukrytego pola w formularzu
            document.getElementById("password").value = password;

            // Wysyłamy formularz
            document.getElementById("transaction-form").submit();
        });
    }
});
