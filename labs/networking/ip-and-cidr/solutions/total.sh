n=$(cut -d/ -f2 block.txt)
echo $((2**(32-n))) > total.txt
