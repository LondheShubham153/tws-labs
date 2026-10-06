m=$(( (0xFFFFFFFF << (32-n)) & 0xFFFFFFFF ))
echo "$((m>>24&255)).$((m>>16&255)).$((m>>8&255)).$((m&255))" > mask.txt
