# Operator's always-listening local server (loopback only). Each connection gets its own
# process, so requests never bounce off a busy listener; the answer comes from helper.sh.
#   perl bridge.pl <port> <wake|ghl> <path to helper.sh>
use strict; use warnings;
use IO::Socket::INET;
use POSIX ":sys_wait_h";
my ($port, $kind, $helper) = @ARGV;
$SIG{CHLD} = sub { while ((my $k = waitpid(-1, WNOHANG)) > 0) {} };
$SIG{PIPE} = 'IGNORE';
my $srv = IO::Socket::INET->new(LocalAddr => '127.0.0.1', LocalPort => $port, Listen => 64, ReuseAddr => 1, Proto => 'tcp')
  or die "bridge: can't listen on $port: $!\n";
while (1) {
  my $c = $srv->accept;
  next unless $c;
  my $pid = fork();
  if (!defined $pid) { close $c; next; }
  if ($pid == 0) {
    close $srv;
    $c->autoflush(1);
    local $SIG{ALRM} = sub { exit 0 };
    alarm 60;
    my $line = <$c>;
    $line = '' unless defined $line;
    $line =~ s/\r?\n$//;
    while (my $h = <$c>) { last if $h =~ /^\r?\n$/; }
    if ($line =~ /^OPTIONS /) {
      print $c "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
      close $c; exit 0;
    }
    my $resp = '';
    if (open(my $out, '-|', '/bin/bash', $helper, $kind, $line)) {
      local $/; $resp = <$out>; close $out;
    }
    $resp = "HTTP/1.1 500 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}" unless defined $resp && length $resp;
    print $c $resp;
    close $c;
    exit 0;
  }
  close $c;
}
