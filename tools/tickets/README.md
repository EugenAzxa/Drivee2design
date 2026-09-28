# Test tickets

Drop real ticket photos in this folder and run `npm run test:tickets` to see
exactly what the scanner reads off each one.

To assert on a ticket, add a JSON file with the same basename:

    my-ticket.jpg
    my-ticket.json     { "doc_type": "parking", "amount": 30, "municipality": "Toronto" }

Only the keys you list are checked. Images here are gitignored — do not commit
photos containing somebody's plate, name or address.
