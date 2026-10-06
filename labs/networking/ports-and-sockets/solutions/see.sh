ss -tln "sport = :$(cat port.txt)" | awk 'NR > 1 { print $4 }' > addr.txt
